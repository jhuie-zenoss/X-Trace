package edu.berkeley.xtrace;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Collection;
import java.util.Random;

import edu.berkeley.xtrace.config.XTraceLogLevel;
import edu.berkeley.xtrace.reporting.Report;
import edu.berkeley.xtrace.reporting.Reporter;

/**
 * An <code>XTraceEvent</code> makes propagating X-Trace metadata easier.
 * An application writer can initialize a new <code>XTraceEvent</code> when
 * a task begins (usually as the result of a new request arriving).
 * Each X-Trace metadata extracted from the request (or requests, if the
 * task is made up of concurrent requests) is added to this context
 * via the <code>addEdge</code> method.  Additionally, information
 * in the form of key-value pairs can be supplied as well.
 * <p>
 * The metadata that should be propagated into any new requests
 * is obtained via the <code>getNewMetadata</code> method.  Lastly,
 * a report obtained via <code>getNewReport</code> should be sent
 * to the report context, which will forward it to the reporting
 * infrastructure.
 * 
 * @author George Porter <gporter@cs.berkeley.edu>
 */
public class XTraceEvent {
	
	/** 
	 * Thread-local random number generator, seeded with machine name
	 * as well as current time. 
	 *
	 **/
	private static ThreadLocal<Random> random
		= new ThreadLocal<Random>() {
		@Override
		protected Random initialValue() {
			// It's very important to have a different random number seed for each thread,
			// so that we don't get OpID collisions in the same X-Trace graph. We therefore
			// base the seed on our hostname, process ID, thread ID, and current time.
			// Java provides no way to get the current PID; however, we can get something
			// similar on the Sun JVM by looking at the RuntimeMXBean (whose name will be
			// something like pid@hostname). This is the only solution I've found that
			// doesn't involve writing native code or exec'ing another process... (Matei)
			int processId = ManagementFactory.getRuntimeMXBean().getName().hashCode();
			try {
				return new Random(++threadId
						+ processId
						+ System.nanoTime()
						+ Thread.currentThread().getId()
						+ InetAddress.getLocalHost().getHostName().hashCode() );
			} catch (UnknownHostException e) {
				// Failed to get local host name; just use the other pieces
				return new Random(++threadId
						+ processId
						+ System.nanoTime()
						+ Thread.currentThread().getId());
			}
		}
	};
	private static volatile long threadId = 0;
	
	Report report;
	private byte[] myOpId;
	private boolean willReport;
	private Class<?> msgclass;
  private XTraceMetadata newmd; 


  /** Cached hostname of the current machine. **/
  public static final String hostname;  
  public static final String processId;
  static {
    String inet_hostname;
    try {
      inet_hostname = InetAddress.getLocalHost().getHostName();
    } catch (UnknownHostException e) {
      inet_hostname = "unknown";
    }
    hostname = inet_hostname;
    processId = ManagementFactory.getRuntimeMXBean().getName();
  }

	/**
	 * Initialize a new XTraceEvent.  This should be done for each
	 * request or task processed by this node.
	 *
	 */
	public XTraceEvent(int opIdLength) {
		this(XTraceLogLevel.DEFAULT, opIdLength);
	}
	
	public XTraceEvent(Class<?> msgclass, int opIdLength) {
		report = new Report();
		myOpId = new byte[opIdLength];
		XTraceEvent.random(myOpId);
		willReport = true;
		this.msgclass = msgclass;
		report.put("Class", msgclass.getName());
		report.put("ThreadID", Long.toString(Thread.currentThread().getId()));
		this.put("ThreadName", Thread.currentThread().getName());
		report.put("ProcessID", processId);	
		report.put("Host", hostname);
	}
	
	XTraceEvent(XTraceMetadata m) {
		report = new Report();
		myOpId = m.getOpId();
		willReport = true;
		this.msgclass = XTraceLogLevel.DEFAULT;
		report.put("Class", msgclass.getName());
		report.put("ThreadID", Long.toString(Thread.currentThread().getId()));
    this.put("ThreadName", Thread.currentThread().getName());
    report.put("ProcessID", processId);	
    report.put("Host", hostname);
	}
	
	/**
	* If any edge added to this event has a higher severity than the threshold (default),
	* this event will not be reported.
	*/
	public void addEdge(XTraceMetadata xtr) {
		if (xtr == null || !xtr.isValid()) {
			return;
		}
		// check for a severity level option field
		OptionField[] options = xtr.getOptions();
		if (options != null) {
			for (int i=0; i <xtr.getNumOptions(); i++) {
				if (options[i].getType()-OptionField.SEVERITY == 0) {
					int severity = (int) options[i].getPayload()[0] & 0xFF;
					willReport = severity < OptionSeverity.DEFAULT;
					report.put("Severity", Integer.toString(severity));
				}
			}
		}

    report.put("Edge", xtr.getOpIdString());
    
    if (newmd==null) {
      newmd = new XTraceMetadata(xtr.getTaskId(), myOpId);
      report.put("X-Trace", newmd.toString(), false);  // report excluding the options from the string repr
      newmd.setOptions(xtr.options);
    }
    
	}
	
	public void addEdges(Collection<XTraceMetadata> xtrs) {
		for (XTraceMetadata m : xtrs) {
			addEdge(m);
		}
	}

	public void put(String key, String value) {
		report.put(key, IoUtil.escapeNewlines(value));
	}
	
	public XTraceMetadata getNewMetadata() {
	  return newmd;
	}
	
	/**
	 * Set the event's metadata to a given value (used for tasks with no edges).
	 */
	public void setMetadata(XTraceMetadata xtr) {
		// TODO: the following line isn't defensive.  Fix by copying the
		// bytes, rather than just the reference.
		myOpId = xtr.getOpId();
		report.put("X-Trace", xtr.toString(), false);
	}
	
	/**
	 * Add a timestamp property with the current time.
	 */
	private void setTimestamp() {
		report.put("Timestamp", Long.toString(System.currentTimeMillis()));
		report.put("HRT", Long.toString(System.nanoTime()));
		if (newmd.options!=null) {
  		report.put("NumOptions", Long.toString(newmd.options.length));
  		for (int i = 0; i < newmd.options.length; i++)
  		  report.put("Option", newmd.options[i].toString());
		}
	}
	
	/**
	 * Create a {@link edu.berkeley.xtrace.reporting.Report} representing this
	 * event, to send to the X-Trace back end. 
	 */
	public Report createReport() {
		setTimestamp();
		return report;
	}
	
	public void sendReport() {
		setTimestamp();
		if (!willReport) { return; }
		if (XTraceLogLevel.isOn(msgclass)) {
			Reporter.getReporter().sendReport(report);
		}
	}
	
	public static void random(byte[] b) {
		random.get().nextBytes(b);
	}
}
