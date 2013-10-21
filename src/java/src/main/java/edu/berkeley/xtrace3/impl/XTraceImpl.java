package edu.berkeley.xtrace3.impl;

import edu.berkeley.xtrace3.api.XTraceAPI;
import edu.berkeley.xtrace3.repr.XEvent;
import edu.berkeley.xtrace3.repr.XStatus;


public class XTraceImpl implements XTraceAPI {
  
  private ThreadLocal<XStatus> threadstatus = new ThreadLocal<XStatus>();

  public void Begin(Object... tags) {
    XStatus status = threadstatus.get();
    if (status!=null)
      return; // If there's already a status, do nothing
    status = new XStatus();
    threadstatus.set(status);
    Log("Trace begin");
  }
  
  /**
   * Attach this thread to the provided XStatus.  
   * Statuses are always copied before being set and further modifications will not be reflected in the original
   * Any current status of the thread is overwritten; if such behavior is undesirable, use the Join method instead.
   * @param status The XTrace status to set as the current status for this thread.  Can be null.
   * @param statuses Further statuses to simultaneously Join
   */
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
    Set(new XStatus(bytes));
  }

  @Override
  public void Set(String string_repr) {
    Set(new XStatus(string_repr));
  }
  
  /**
   * Merges the provided XTrace statuses into the thread's current status
   * @param statuses Zero or more XTrace statuses to merge into the thread's current status.
   */
  public void Join(XStatus... statuses) {
    if (statuses.length==0)
      return;
    
    threadstatus.set(XStatus.Merge(threadstatus.get(), statuses));
  }

  @Override
  public void Join(byte[] bytes) {
    Join(new XStatus(bytes));
  }

  @Override
  public void Join(String string_repr) {
    Join(new XStatus(string_repr));
  }
  
  /**
   * Detach this thread from its current status, and return the status.  If there is no status, returns null.
   */
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
  public XStatus Switch(XStatus status, XStatus... statuses) {
    XStatus previous = threadstatus.get();
    Set(status, statuses);
    return previous;
  }
  
  /**
   * Returns a copy of the thread's current status.  For performance reasons, it is better to favour the Unset or Switch methods
   * to the Branch method where possible.
   * @return
   */
  public XStatus Get() {
    return threadstatus.get();
  }
  
  /**
   * Tests whether there is currently a valid XTrace status set for this thread
   * @return true if a valid XTrace status is set for this thread.  false otherwise.
   */
  public boolean Valid() {
    return threadstatus.get() != null;
  }

  @Override
  public byte[] ToBytes() {
    return null;
  }  

}
