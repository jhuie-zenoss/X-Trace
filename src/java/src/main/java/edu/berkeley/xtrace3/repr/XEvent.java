package edu.berkeley.xtrace3.repr;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.UnknownHostException;

import edu.berkeley.xtrace.IoUtil;
import edu.berkeley.xtrace.XTraceMetadata;
import edu.berkeley.xtrace.reporting.Report;
import edu.berkeley.xtrace.reporting.Reporter;

public class XEvent {
  
  public final XStatus before;
  public final XStatus after;
  private Report report; 

  /**
   * Creates an XEvent starting from the provided status.
   * Generates a new status for after the event occurred
   * @param status the state before the event occurs
   */
  public XEvent(XStatus status) {
    this(status, status.Next());
  }
  
  /**
   * Creates an XEvent between the two statuses provided
   * @param from The state before the event occurred
   * @param to The state after the event occurred
   */
  public XEvent(XStatus from, XStatus to) {
    report = new Report();
    before = from;
    after = to;
    
    // Set the timestamp and hostname of this event
    this.setHostname();
    this.setTimestamp();
    
    // Set the ID of this event based on the 'to' status
    // Call back to old XTraceMetadata implementation to get bytes for the ops
    String eventid = new XTraceMetadata(after.taskid, after.previous[0]).toString();
    this.put("X-Trace", eventid);
    
    // Set the edge IDs based on the 'from' status
    for (byte[] prior_op : before.previous) {
      String prior_id = new XTraceMetadata(before.taskid, prior_op).toString();
      this.put("Edge", prior_id);
    }
  }
  
  /**
   * Adds a key-value pair to this event
   */
  public XEvent put(String key, String value) {
    report.put(key, IoUtil.escapeNewlines(value));
    return this;
  }
  
  /**
   * Adds a label to this event.  Multiple labels can be added
   * @param format A string, optionally with string format arguments
   * @param args Optional arguments to be passed to String.format
   * @return
   */
  public XEvent message(String format, Object... args) {
    return this.put("Label", String.format(format,  args));
  }
  
  /**
   * Add the hostname to the report if possible
   */
  private static String hostname;
  private void setHostname() {
    if (hostname == null) {
      try {
        hostname = InetAddress.getLocalHost().getHostName();
      } catch (UnknownHostException e) {
        hostname = "unknown";
      }
    }
    this.put("Host", hostname);
  }

  /**
   * Add a timestamp property with the current time.
   */
  private void setTimestamp() {
    long time = System.currentTimeMillis();
    String value = String.format("%d.%03d", time/1000, time%1000);
    report.put("Timestamp", value);
  }
  
  /**
   * Adds thread id, name, process id, etc. to the report
   */
  public XEvent verbose() {
    this.put("ThreadID", String.valueOf(Thread.currentThread().getId()));
    this.put("ThreadName", String.valueOf(Thread.currentThread().getName()));
    this.put("ProcessID", ManagementFactory.getRuntimeMXBean().getName());      
    return this;
  }
  
  public void sendReport() {
    Reporter.getReporter().sendReport(report);
  }
  
  
}
