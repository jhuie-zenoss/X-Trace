package edu.berkeley.xtrace.impl;

import edu.berkeley.xtrace.XTraceLogLevel;
import edu.berkeley.xtrace.api.XTraceAPI;


public class XTraceImpl implements XTraceAPI {
  
  ThreadLocal<XStatus> threadstatus = new ThreadLocal<XStatus>();

  @Override
  public void Begin(Object... tags) {
    if (threadstatus.get()!=null)
      return; // If there's already a status, do nothing
    threadstatus.set(new XStatus());
    Log("Trace begin");
  }
  
  /**
   * Attach this thread to the provided XStatus.  
   * Statuses are always copied before being set and further modifications will not be reflected in the original
   * Any current status of the thread is overwritten; if such behavior is undesirable, use the Join method instead.
   * @param status The XTrace status to set as the current status for this thread.  Can be null.
   * @param statuses Further statuses to simultaneously Join
   */
  @Override
  public void Set(XStatus status, XStatus... statuses) {    
    // Singleton case - only one status, copy it in, regardless of whether it's null
    if (statuses.length==0) {
      threadstatus.set(status);
      return;
    }
    
    /* Iterate through the statuses once.  
     * If it turns out there are 0 or 1 non-null statuses, we can immediately return.
     * If there are 2 or more, then we merge them using XStatus.Merge */
    XStatus singleton = status;
    for (int i = 0; i < statuses.length; i++) {
      if (singleton==null) {
        singleton = statuses[i];
      } else if (statuses[i]!=null) {
        threadstatus.set(XStatus.Merge(status, statuses)); // No need to copy, because merge will definitely create a new status
        return;
      }
    }
    threadstatus.set(singleton);
  }

  @Override
  public void Set(byte[] bytes) {
    Set(XStatus.fromBytes(bytes));
  }

  @Override
  public void Set(String string_repr) {
    Set(XStatus.fromString(string_repr));
  }
  
  /**
   * Merges the provided XTrace statuses into the thread's current status
   * @param statuses Zero or more XTrace statuses to merge into the thread's current status.
   */
  @Override
  public void Join(XStatus... statuses) {
    if (statuses.length==0)
      return;
    
    threadstatus.set(XStatus.Merge(threadstatus.get(), statuses));
  }

  @Override
  public void Join(byte[] bytes) {
    Join(XStatus.fromBytes(bytes));
  }

  @Override
  public void Join(String string_repr) {
    Join(XStatus.fromString(string_repr));
  }
  
  /**
   * Detach this thread from its current status, and return the status.  If there is no status, returns null.
   */
  @Override
  public XStatus Unset() {
    XStatus current = threadstatus.get();
    threadstatus.set(null);
    return current;
  }
  
  /**
   * Replace this thread's current status with the provided statuses.  Returns the thread's current status
   * @param statuses
   * @return
   */
  @Override
  public XStatus Switch(XStatus status, XStatus... statuses) {
    XStatus previous = threadstatus.get();
    Set(status, statuses);
    return previous;
  }
  
  /**
   * Returns the thread's current status. 
   * @return
   */
  @Override
  public XStatus Get() {
    return threadstatus.get();
  }
  
  /**
   * Tests whether there is currently a valid XTrace status set for this thread
   * @return true if a valid XTrace status is set for this thread.  false otherwise.
   */
  @Override
  public boolean Valid() {
    return threadstatus.get() != null;
  }

  @Override
  public byte[] ToBytes() {
    return null;
  }  

  /**
   * Logs an XTrace event using the thread's current XTrace status
   * @param format A format string
   * @param args Arguments for the format string
   */
  @Override
  public void Log(String format, Object... args) {
    Log(null, format, args);
  }
  
  /**
   * Logs an XTrace event using the thread's current XTrace status
   * @param cls The class against which to log the message.  Classes can be filtered in the X-Trace conf to ignore messages
   * @param format A format string
   * @param args Arguments for the format string
   */
  @Override
  public void Log(Class<?> cls, String format, Object... args) {
    if (cls==null || XTraceLogLevel.isOn(cls)) {
      XEvent event = new XEvent(threadstatus.get()).verbose().message(format, args);
      event.sendReport();
      threadstatus.set(event.after);
    }
  }

  /**
   * Get this thread's current XStatus as bytes.  Calling this method
   * may trigger a 'merge' event to be sent, in which case the bytes
   * returned are the bytes for the subsequent thread status.
   * @return a byte array containing the 
   */
  @Override
  public byte[] GetBytes() {
    XStatus current = threadstatus.get();
    if (current==null)
      return null;
    
    // If we have more than one parent, we must send a merge event
    if (current.previous.length > 1)
      current = logMerge();
    
    return current.byteRepr();
  }

  @Override
  public String GetString() {
    XStatus current = threadstatus.get();
    if (threadstatus.get()==null)
      return null;
    
    // If we have more than one parent, we must send a merge event
    if (current.previous.length > 1)
      current = logMerge();
    
    return current.stringRepr();
  }
  
  /**
   * Logs a 'merge' operation event.  Null check before calling this method.
   */
  private XStatus logMerge() {
    XEvent event = new XEvent(threadstatus.get()).verbose().operation("merge");
    event.sendReport();
    threadstatus.set(event.after);
    return event.after;
  }

}
