package edu.berkeley.xtrace;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Collection;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;

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
   * This is the same as XTraceContext.getThreadContext, but prior to returning the context, we jet
   * off an empty event.  This is to ensure the correct divide of pre- and post- thread start CPU usage
   */
  public static Collection<XTraceMetadata> getContextForNewThread() {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "threadbranch");
      sendEvent(event);
    }
    return XTraceContext.getThreadContext();
  }

  /**
   * Sends out an event recording the start of processing on this thread
   */
  public static void threadStart() {
    threadStart(null);
  }
  
  public static void threadStart(String name) {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "threadstart");
      if (name!=null)
        event.put("Name", name);
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
  
  /**
   * Generate an event indicating that the current thread is about to request the specified lock
   * @param lock the lock object that is about to be requested.  This method doesn't actually 
   * try to acquire the lock, but it uses its address as a unique ID in the event report
   */
  public static void requestLock(Lock lock) {
    requestLock(lock, null);
  }
  
  /**
   * Generate an event indicating that the current thread is about to request the specified lock
   * @param lock the lock object that is about to be requested.  This method doesn't actually 
   * try to acquire the lock, but it uses its address as a unique ID in the event report
   * @param lockname a user specified name for the lock, to help with identification
   */
  public static void requestLock(Object lock, String lockname) {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "requestlock");
      event.put("LockID", Integer.toString(lock.hashCode()));
      if (lockname!=null)
        event.put("LockName", lockname);
      sendEvent(event);
    }    
  }
  
  /**
   * Generate an event indicating that we acquired the specified lock.  This call should
   * follow a call to requestLock
   * @param lock
   */
  public static void acquiredLock(Object lock) {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "acquiredlock");
      event.put("LockID", Integer.toString(lock.hashCode()));
      sendEvent(event);
    }        
  }
  
  /**
   * Generate an event indicating that we aborted trying to acquire the specified lock.  This call should
   * follow a call to requestLock
   * @param lock
   */
  public static void abortLock(Object lock) {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "abortlock");
      event.put("LockID", Integer.toString(lock.hashCode()));
      sendEvent(event);
    }        
  }

  
  /**
   * Generate an event indicating that we are releasing the specified lock.  This call should
   * follow a call to acquiredLock
   * @param lock
   */
  public static void releasedLock(Object lock) {
    if (isValid()) {
      XTraceEvent event = newEvent();
      event.put("Operation", "releasedLock");
      event.put("LockID", Integer.toString(lock.hashCode()));
      sendEvent(event);
    }        
  }
    
  public static class XTraceWrappedLock implements Lock {
    
    private String name;
    private Lock wrapped;

    public XTraceWrappedLock(Lock wrapped) {
      this(wrapped, null);
    }
    
    public XTraceWrappedLock(Lock wrapped, String name) {
      this.wrapped = wrapped;
      this.name = name;
    }

    @Override
    public void lock() {
      requestLock(wrapped, name);
      wrapped.lock();
      acquiredLock(wrapped);
    }

    @Override
    public void lockInterruptibly() throws InterruptedException {
      requestLock(wrapped, name);
      wrapped.lock();
      acquiredLock(wrapped);
    }

    @Override
    public Condition newCondition() {
      return wrapped.newCondition();
    }

    @Override
    public boolean tryLock() {
      requestLock(wrapped, name);
      boolean acquired = wrapped.tryLock();
      if (acquired)
        acquiredLock(wrapped);
      else
        abortLock(wrapped);
      return acquired;
    }

    @Override
    public boolean tryLock(long time, TimeUnit unit) throws InterruptedException {
      requestLock(wrapped, name);
      boolean acquired = wrapped.tryLock(time, unit);
      if (acquired)
        acquiredLock(wrapped);
      else
        abortLock(wrapped);
      return acquired;
    }

    @Override
    public void unlock() {
      wrapped.unlock();
      releasedLock(wrapped);
    }
    
  }

}
