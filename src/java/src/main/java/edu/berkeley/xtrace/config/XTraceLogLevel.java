package edu.berkeley.xtrace.config;

import java.util.Collection;
import java.util.HashSet;

import edu.berkeley.xtrace.XTraceContext;

/**
 * This class maintains the set of logging classes that are disabled.
 * Used by XTraceContext to determine whether an attempt to log an event
 * should actually be ignored or not.
 * 
 * Getting and setting the active log levels should be done via
 * the {@link XTraceConfiguration} class
 * 
 * @author jon
 */
public class XTraceLogLevel {

  /** The default class against which X-Trace events will be logged */
  public static final Class<?> DEFAULT = XTraceContext.class;
  
  boolean defaultEnabled = true;
  Collection<Class<?>> enabled = new HashSet<Class<?>>();
  Collection<Class<?>> disabled = new HashSet<Class<?>>();
  
  /**
   * Set the specified class to 'off'.
   * Events logged against this class will be ignored.
   * @param cls
   */
	public void off(Class<?> cls) {
	  if (cls!=null) {
      enabled.remove(cls);
      disabled.add(cls);
	  }
	}

  /**
   * Set the specified class to 'on'.
   * Events logged against this class are not ignored
   * @param cls
   */
	public void on(Class<?> cls) {
	  if (cls!=null) {
	    enabled.add(cls);
	    disabled.remove(cls);
	  }
	}
	
	public boolean enabled(Class<?> cls) {
	  return defaultEnabled ? !disabled.contains(cls) : enabled.contains(cls);
	}

	/**
	 * Tests whether the events logged against the specified class will be ignored
	 * @param cls Any class
	 * @return false if the events logged against this class will be ignored; true otherwise
	 */
	public static boolean isOn(Class<?> cls) {
	  return XTraceConfiguration.active.loglevels.enabled(cls);
	}

}
