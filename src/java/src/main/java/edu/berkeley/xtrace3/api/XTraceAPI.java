package edu.berkeley.xtrace3.api;

import edu.berkeley.xtrace3.repr.XStatus;

/**
 * Contains methods for creating, setting, and unsetting X-Trace metadata.  Use these methods
 * to maintain X-Trace metadata through a program.
 * To log actual events, call methods in the {@link XLog} class 
 * @author jon
 */
public interface XTraceAPI {

    /**
     * Creates and sets a new XTrace status for this thread.  If this thread already has an XTrace status, then this method does nothing.
     * This method will log an event to get the trace begun.
     * @param tags Tags for the task 
     */
    public void Begin(Object... tags);
    
    /**
     * Attach this thread to the provided XStatus.  If multiple statuses are provided, they are merged.
     * Any current status of the thread is overwritten; if such behavior is undesirable, use the Join method instead.
     * Statuses are copied - any further user changes to the XTrace statuses provided as arguments will not be reflected by the thread's XTrace status
     * @param statuses The XTrace statuses to set as the current status for this thread.  Can be null.
     */
    public void Set(XStatus status, XStatus... statuses);
    
    /**
     * Attach this thread to the provided XStatus.  The XStatus will be deserialized from the 
     * provided bytes and validated.  If it is valid, the XStatus will be set, otherwise the XStatus
     * will be set to null.
     * This call is equavalent to Set(new XStatus(bytes))
     */
    public void Set(byte[] bytes);
    
    /**
     * Attach this thread to the provided XStatus.  The XStatus will be deserialized from the 
     * provided String and validated.  If it is valid, the XStatus will be set, otherwise the XStatus
     * will be set to null.
     * This call is equavalent to Set(new XStatus(string_repr))
     */
    public void Set(String string_repr);
    
    /**
     * Merges the provided XTrace statuses into the thread's current status
     * @param statuses Zero or more XTrace statuses to merge into the thread's current status.
     */
    public void Join(XStatus... statuses);
    
    /**
     * Merges the provided XTrace status into the thread's current status.  
     * The XStatus will be deserialized from the provided bytes and validated.  
     * If it is valid, the XStatus will be set, otherwise the XStatus will be set to null.
     * This call is equavalent to Join(new XStatus(bytes))
     */
    public void Join(byte[] bytes);
    
    /**
     * Merges the provided XTrace status into the thread's current status.  
     * The XStatus will be deserialized from the provided String and validated.  
     * If it is valid, the XStatus will be set, otherwise the XStatus will be set to null.
     * This call is equavalent to Join(new XStatus(string_repr))
     */
    public void Join(String string_repr);
    
    /**
     * Detach this thread from its current status, and return the status.  If there is no status, returns null.
     */
    public XStatus Unset();
    
    /**
     * Replace this thread's current status with the provided statuses.  Returns the thread's current status
     * @param statuses
     * @return
     */
    public XStatus Switch(XStatus status, XStatus... statuses);
    
    /**
     * Get this thread's current XStatus
     * @return
     */
    public XStatus Get();
    
    /**
     * Tests whether there is currently a valid XTrace status set for this thread
     * @return true if a valid XTrace status is set for this thread.  false otherwise.
     */
    public boolean Valid();
    
    /**
     * Returns the current XStatus in bytes form.  This is part of the XTrace API
     * rather than a method on the XStatus object because the byte format of XStatus
     * only allows a single previous op id to be serialized.  Thus, a call to this method
     * may generate a 'merge' report and update the thread's current XStatus.
     * @return
     */
    public byte[] ToBytes();

}
