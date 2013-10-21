package edu.berkeley.xtrace3;

import edu.berkeley.xtrace3.api.XLogAPI;
import edu.berkeley.xtrace3.impl.XLogImpl;

/**
 * Contains methods for logging events using X-Trace.
 * Use the {@link XTrace} API to maintain the logical X-Trace metadata.
 * @author jon
 */
public class XLog {
  
  private static XLogAPI xlog = new XLogImpl();

}
