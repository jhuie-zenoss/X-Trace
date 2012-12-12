package edu.berkeley.xtrace;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.util.Collection;
import java.util.HashSet;

/**
 * This class maintains the set of logging classes that are disabled.
 * Used by XTraceContext to determine whether an attempt to log an event
 * should actually be ignored or not
 * 
 * @author jon
 */
public class XTraceLogLevel {

	public static Class<?> DEFAULT = XTraceContext.class;
	
	/**
	 * Contains the classes for whom we ignore any events
	 */
	private static Collection<Class<?>> disabled = new HashSet<Class<?>>();
	
	public static void off(Class<?> cls) {
		disabled.add(cls);
	}
	
	public static void on(Class<?> cls) {
		disabled.remove(cls);
	}
	
	public static boolean isOn(Class<?> cls) {
		return !disabled.contains(cls);
	}
	
	public static void loadConfiguration(String filename) throws FileNotFoundException {
		System.out.println("XTraceContext loading conf file " + filename);
		
		BufferedReader br = new BufferedReader(new FileReader(filename));
		String line;

		int succeeded = 0, failed = 0;
		try {
			while ((line = br.readLine()) != null) {
				// Ignore blank and commented-out lines
				if (line.equals("") || line.startsWith("//")) {
					continue;
				}

				
				try {
					off(Class.forName(line));
					succeeded++;
				} catch (ClassNotFoundException e) {
					System.out.println(e.getMessage());
					failed++;
				}
			}
		} catch (IOException e) {
			System.out.println("Exception reading " + filename + ": " + e.getMessage());
		}
		System.out.println("Finished reading " + filename + ".  " + succeeded + 
				" classes successfully disabled, " + failed + " classes not found.");
	}
	
	private static void loadDefaultConfiguration() throws FileNotFoundException {
		URL resource = Thread.currentThread().getContextClassLoader().getResource("xtrace.conf");
		if (resource!=null) {
			String filename = resource.getFile();
			loadConfiguration(filename);
		}
	}
	
	static {
		try {
			loadDefaultConfiguration();
		} catch (Exception e) {
			System.out.println("Could not load xtrace.conf: " + e.getMessage());			
		}
	}

}
