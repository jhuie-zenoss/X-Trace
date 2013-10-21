package edu.berkeley.xtrace;

import edu.berkeley.xtrace.api.XTraceAPI;
import edu.berkeley.xtrace.impl.XStatus;
import edu.berkeley.xtrace.impl.XTraceImpl;

public class XTrace {
  
  public static XTraceAPI xtrace = new XTraceImpl();

  /**
   * Creates and sets a new XTrace status for this thread.  If this thread already has an XTrace status, then this method does nothing.
   * This method does not log any events.
   */
  public static void Begin(Object... tags) {
    xtrace.Begin(tags);
  }
  
  /**
   * Get this thread's current XStatus
   * @return
   */
  public XStatus Get() {
    return xtrace.Get();
  }
  
  /**
   * Get this thread's current XStatus as bytes.  Calling this method
   * may trigger a 'merge' event to be sent
   * @return
   */
  public byte[] GetBytes() {
    return xtrace.GetBytes();
  }
  
  /**
   * Attach this thread to the provided XStatus.  If multiple statuses are provided, they are merged.
   * Any current status of the thread is overwritten; if such behavior is undesirable, use the Join method instead.
   * Statuses are copied - any further user changes to the XTrace statuses provided as arguments will not be reflected by the thread's XTrace status
   * @param statuses The XTrace statuses to set as the current status for this thread.  Can be null.
   */
  public static void Set(XStatus status, XStatus... statuses) {
    xtrace.Set(status, statuses);
  }
  
  /**
   * Merges the provided XTrace statuses into the thread's current status
   * @param statuses Zero or more XTrace statuses to merge into the thread's current status.
   */
  public static void Join(XStatus... statuses) {
    xtrace.Join(statuses);
  }
  
  /**
   * Detach this thread from its current status, and return the status.  If there is no status, returns null.
   */
  public static XStatus Unset() {
    return xtrace.Unset();
  }
  
  /**
   * Replace this thread's current status with the provided statuses.  Returns the thread's current status
   * @param statuses
   * @return
   */
  public XStatus Switch(XStatus status, XStatus... statuses) {
    return xtrace.Switch(status, statuses);
  }
  
  /**
   * Tests whether there is currently a valid XTrace status set for this thread
   * @return true if a valid XTrace status is set for this thread.  false otherwise.
   */
  public boolean Valid() {
    return xtrace.Valid();
  }
  

}
