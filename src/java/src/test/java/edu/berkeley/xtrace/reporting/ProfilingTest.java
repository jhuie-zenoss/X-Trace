package edu.berkeley.xtrace.reporting;

import junit.framework.TestCase;

import org.junit.Test;

import edu.berkeley.xtrace.XTraceContext;
import edu.berkeley.xtrace.reporting.Reporter;

public final class ProfilingTest extends TestCase {
  
  @Override
  public void setUp() {
    Reporter.reporter = new NullReporter();
  }

  @Test
  public void testLogEventSpeed() {
    double numTests = 10000.0;
    XTraceContext.startTrace("Profiling Test", "test");
    
    long total = 0;
    for (int i = 0; i < numTests; i++) {
      long start = System.nanoTime();
      XTraceContext.logEvent("blah", "blah");
      total += System.nanoTime() - start;
    }
    
    System.out.printf("LogEvent profiling: Average time: %.3f ms\n", (total / numTests) / 1000000.0);
  }

}
