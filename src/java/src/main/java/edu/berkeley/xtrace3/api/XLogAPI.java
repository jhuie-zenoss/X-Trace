package edu.berkeley.xtrace3.api;

/**
 * Use these methods to log X-Trac events.
 * To create, set or unset the X-Trace metadata, call methods in the {@link XTrace} API.
 * @author jon
 *
 */
public interface XLogAPI {
  
  /**
   * Logs an XTrace event using the thread's current XTrace status
   * @param format A format string
   * @param args Arguments for the format string
   */
  public void Log(String format, Object... args);
}
