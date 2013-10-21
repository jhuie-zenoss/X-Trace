package edu.berkeley.xtrace3.impl;

import edu.berkeley.xtrace3.api.XLogAPI;
import edu.berkeley.xtrace3.repr.XEvent;

public class XLogImpl implements XLogAPI {

  /**
   * Logs an XTrace event using the thread's current XTrace status
   * @param format A format string
   * @param args Arguments for the format string
   */
  public void Log(String format, Object... args) {
    XEvent event = new XEvent(threadstatus.get()).verbose().message(format, args);
    event.sendReport();
    threadstatus.set(event.after);
  }

}
