package edu.berkeley.xtrace3;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.HashSet;

import junit.framework.TestCase;

import org.junit.Test;

import edu.berkeley.xtrace.OptionField;
import edu.berkeley.xtrace.TaskID;
import edu.berkeley.xtrace.XTraceContext;
import edu.berkeley.xtrace3.repr.XStatus;

public class XStatusTest extends TestCase {
  
  @Override
  public void setUp() {
    XTraceContext.clearThreadContext();
  }
  
  /**
   * Reflectively extracts the Task ID from the provided XStatus.
   * Propagates exceptions.
   */
  private TaskID getTaskID(XStatus status) throws IllegalArgumentException, IllegalAccessException, SecurityException, NoSuchFieldException {
    Field field = status.getClass().getDeclaredField("taskid");
    field.setAccessible(true);
    return (TaskID) field.get(status);
  }
  
  /**
   * Reflectively extracts the opid length from the provided XStatus.
   * Propagates exceptions.
   */
  private int getOpIdLength(XStatus status) throws IllegalArgumentException, IllegalAccessException, SecurityException, NoSuchFieldException {
    Field field = status.getClass().getDeclaredField("opid_length");
    field.setAccessible(true);
    return (Integer) field.get(status);
  }
  
  /**
   * Reflectively extracts the previous op ids from the provided XStatus.
   * Propagates exceptions.
   */
  private byte[][] getPrevious(XStatus status) throws IllegalArgumentException, IllegalAccessException, SecurityException, NoSuchFieldException {
    Field field = status.getClass().getDeclaredField("previous");
    field.setAccessible(true);
    return (byte[][]) field.get(status);
  }
  
  /**
   * Reflectively extracts the options from the provided XStatus.
   * Propagates exceptions.
   */
  private HashSet<OptionField> getOptions(XStatus status) throws IllegalArgumentException, IllegalAccessException, SecurityException, NoSuchFieldException {
    Field field = status.getClass().getDeclaredField("options");
    field.setAccessible(true);
    return (HashSet<OptionField>) field.get(status);
  }
  

  @Test
  public void testEmptyConstructor() throws SecurityException, NoSuchFieldException, IllegalArgumentException, IllegalAccessException {
    doDefaultsTest(new XStatus());
  }
  
  private void doDefaultsTest(XStatus status) throws IllegalArgumentException, SecurityException, IllegalAccessException, NoSuchFieldException {
    TaskID taskid = getTaskID(status);
    assertNotNull(taskid);
    assertEquals(taskid.get().length, XStatus.DEFAULT_TASKID_LENGTH);
    
    int opid_length = getOpIdLength(status);
    assertEquals(opid_length, XStatus.DEFAULT_OPID_LENGTH);
    
    byte[][] previous = getPrevious(status);
    assertNotNull(previous);
    assertTrue(previous.length==0);
    
    HashSet<OptionField> options = getOptions(status);
    assertNotNull(options);
    assertTrue(options.size()==0);
  }
  
  @Test
  public void testNext () throws IllegalArgumentException, SecurityException, IllegalAccessException, NoSuchFieldException {
    XStatus original = new XStatus();
    XStatus next = original.Next();
    for (int i = 0; i < 100; i++) {
      XStatus original_next = original.Next();
      XStatus next_next = next.Next();
      assertFalse(original==next);
      assertFalse(original==original_next);
      assertFalse(original==next_next);
      assertFalse(next==original_next);
      assertFalse(next==next_next);
      assertFalse(original_next==next_next);

      assertTrue(getTaskID(original)==getTaskID(next));
      assertTrue(getTaskID(original)==getTaskID(original_next));
      assertTrue(getTaskID(original)==getTaskID(next_next));

      assertTrue(getOpIdLength(original)==getOpIdLength(next));
      assertTrue(getOpIdLength(original)==getOpIdLength(original_next));
      assertTrue(getOpIdLength(original)==getOpIdLength(next_next));

      assertTrue(getOptions(original)==getOptions(next));
      assertTrue(getOptions(original)==getOptions(original_next));
      assertTrue(getOptions(original)==getOptions(next_next));

      assertFalse(getPrevious(original)==getPrevious(next));
      assertFalse(getPrevious(original)==getPrevious(original_next));
      assertFalse(getPrevious(original)==getPrevious(next_next));
      assertFalse(getPrevious(next)==getPrevious(original_next));
      assertFalse(getPrevious(next)==getPrevious(next_next));
      assertFalse(getPrevious(original_next)==getPrevious(next_next));
      assertFalse(Arrays.equals(getPrevious(next), getPrevious(original_next)));
      assertFalse(Arrays.equals(getPrevious(next), getPrevious(next_next)));
      assertFalse(Arrays.equals(getPrevious(next_next), getPrevious(original_next)));
      next = next_next;
    }
  }
  
  @Test
  public void testMerge() throws IllegalArgumentException, SecurityException, IllegalAccessException, NoSuchFieldException {
    XStatus empty = new XStatus();
    XStatus a = empty.Next();
    XStatus b = a.Next();
    assertTrue(getTaskID(a)==getTaskID(b));
    assertTrue(getOpIdLength(a)==getOpIdLength(b));
    assertTrue(getOptions(a)==getOptions(b));
    byte[][] e = getPrevious(empty);
    byte[][] as = getPrevious(a);
    byte[][] bs = getPrevious(b);
    assertTrue(e.length==0);
    assertTrue(as.length==1);
    assertTrue(bs.length==1);
    assertFalse(as[0]==bs[0]);
    assertFalse(Arrays.equals(as[0], bs[0]));
    
    XStatus merged = XStatus.Merge(a, b);
    assertTrue(getTaskID(merged)==getTaskID(a));
    assertTrue(getOpIdLength(merged)==getOpIdLength(a));
    assertTrue(getOptions(a)==getOptions(b));
    byte[][] ms = getPrevious(merged);
    assertFalse(ms==e);
    assertFalse(ms==as);
    assertFalse(ms==bs);
    assertTrue(ms.length==2);
    assertTrue(Arrays.equals(ms[0], as[0]) || Arrays.equals(ms[1], as[0]));
    assertTrue(Arrays.equals(ms[0], bs[0]) || Arrays.equals(ms[1], bs[0]));
    
    for (int i = 0; i < 100; i++) {
      XStatus[] statuses = new XStatus[i];
      for (int j = 0; j < i; j++) {
        statuses[j] = null;
      }
      merged = XStatus.Merge(a, statuses);
      assertTrue(merged==a);
      merged = XStatus.Merge(null, statuses);
      assertTrue(merged==null);
      for (int j = 0; j < i; j++) {
        statuses[j] = a;
      }
      merged = XStatus.Merge(a, statuses);
      assertTrue(getTaskID(merged)==getTaskID(a));
      assertTrue(getOpIdLength(merged)==getOpIdLength(a));
      assertTrue(getOptions(merged)==getOptions(a));
      assertTrue(getPrevious(merged).length==1);
      assertTrue(Arrays.equals(getPrevious(a), getPrevious(merged)));
    }
  }

}
