package edu.berkeley.xtrace;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Collection;

/**
 * A semi-temporary class add events for some of the resource tracing
 * we want to do.  Later, this will be separated from X-Trace
 * @author jon
 *
 */
public class XTraceResourceTracing {
  
  private static boolean isValid() {
    return XTraceContext.isValid() && XTraceLogLevel.isOn(XTraceResourceTracing.class);
  }
  
  private static XTraceEvent newEvent() {
    if (!isValid())
      return null;

    Collection<XTraceMetadata> metadatas = XTraceContext.getThreadContext();
    
    int opIdLength = XTraceContext.defaultOpIdLength;
    if (metadatas.size()!=0) {
      opIdLength = metadatas.iterator().next().getOpIdLength();
    }
    
    XTraceEvent event = new XTraceEvent(XTraceResourceTracing.class, opIdLength);

    for (XTraceMetadata m : metadatas) {
      event.addEdge(m);
    }

    try {
      if (XTraceContext.hostname == null) {
        XTraceContext.hostname = InetAddress.getLocalHost().getHostName();
      }
    } catch (UnknownHostException e) {
      XTraceContext.hostname = "unknown";
    }

    event.put("Host", XTraceContext.hostname);
    return event;
  }
  
  private static void sendEvent(XTraceEvent event) {
    XTraceMetadata newcontext = event.getNewMetadata();
    XTraceContext.doSetThreadContext(newcontext);
    event.sendReport();
  }

  /**
   * Sends out an event recording the start of processing on this thread
   */
  public static void threadStart() {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "threadstart");
      sendEvent(event);
    }
  }
  
  public static void threadEnd() {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "threadend");
      sendEvent(event);
    }
  }
  
  public static void waitStart() {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "waitstart");
      sendEvent(event);
    }
  }
  
  public static void waitEnd() {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "waitend");
      sendEvent(event);
    }
  }

}
