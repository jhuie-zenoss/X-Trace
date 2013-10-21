package edu.berkeley.xtrace3.repr;

import java.util.Arrays;
import java.util.HashSet;

import edu.berkeley.xtrace.OptionField;
import edu.berkeley.xtrace.TaskID;

/**
 * Class containing ongoing XTrace tracing information.  An XStatus object is immutable,
 * that is, whenever an operation is performed that changes an XStatus, a new XStatus object
 * is created.  XStatus objects are reused whereever possible.
 * @author jon
 */
public class XStatus {
  
  static final int DEFAULT_OPID_LENGTH = 8;
  static final int DEFAULT_TASKID_LENGTH = 8;
  private static final byte[][] EMPTY_BYTES = new byte[0][];
  private static final HashSet<OptionField> EMPTY_OPTIONS = new HashSet<OptionField>(0);
  
  // The Task ID remains constant
  final TaskID taskid;

  // Each event has a unique ID
  int opid_length = DEFAULT_OPID_LENGTH;
  byte[][] previous = EMPTY_BYTES;

  // XTrace statuses can carry around options.  The implementation of these isn't optimized
  HashSet<OptionField> options = EMPTY_OPTIONS;
  
  /**
   * Creates a new XStatus with a randomly generated task ID
   */
  public XStatus() {
    this(new TaskID(DEFAULT_TASKID_LENGTH));
  }
  
  /**
   * Reconstructs an XStatus from the provided byte representation
   */
  public XStatus(byte[] bytes) {
    taskid = null;
  }
  
  /**
   * Reconstructs an XStatus from the provided String representation
   */
  public XStatus(String string_repr) {
    taskid = null;    
  }
  
  private XStatus(TaskID taskid) {
    this.taskid = taskid;
  }
  
  /**
   * Private merge constructor.
   * @param status must not be null
   * @param statuses elements must not be null
   */
  private XStatus(XStatus status, XStatus... statuses) {    
    // Copy across the task id and stuff
    taskid = status.taskid;
    opid_length = status.opid_length;
    
    // Count the number of ops that we're going to consider
    int count = status.previous.length;
    for (XStatus next : statuses)
      count += next.previous.length;
    
    if (count == 0) {
      previous = EMPTY_BYTES;
    } else {
      // Create an array that can hold all of the op ids assuming no duplicates
      previous = Arrays.copyOf(status.previous, count);
      
      // Now copy in opids, but check for duplicates.  This implementation is inefficient.
      int length = status.previous.length;
      for (XStatus next : statuses) { // iterate through each of the passed in statuses
        for (byte[] op : next.previous) { // for each passed in status, look through it's op ids
          boolean unique = true;
          for (int i = 0; i < length; i++) { // test for equality against every op id copied so far
            if (Arrays.equals(previous[i], op)) {
              unique = false;
              break;
            }
          }
          if (unique) // only if the op id hasn't already been copied, do we copy it
            previous[length++] = op;
        }
      }
      
      // Now, reduce the array
      if (length < previous.length)
        previous = Arrays.copyOf(previous, length);
    }
    
    // Finally, deal with the options
    boolean hasoptions = !status.options.isEmpty();
    for (XStatus next : statuses) {
      if (hasoptions)
        break;
      hasoptions &= !next.options.isEmpty();
    }
    if (hasoptions) {
      options = new HashSet<OptionField>(status.options);
      for (XStatus next : statuses)
        options.addAll(next.options);
    } else {
      options = EMPTY_OPTIONS;
    }
  }
  
  /**
   * Merges multiple XStatus together and returns the merged status.
   * Task ID's aren't validated, and the task id of the first status is the one that is used
   * @param status a status to merge
   * @param statuses statuses to merge
   * @return a status representing the merger of all the provided statuses
   */
  public static XStatus Merge(XStatus status, XStatus... statuses) {
    // If only one provided, return immediately
    if (statuses.length==0)
      return status;
    
    // Count the number of non-null statuses provided
    int count = status==null ? 0 : 1;
    for (XStatus next : statuses)
      if (next!=null)
        count++;
    
    // If everything is null, return null
    if (count==0)
      return null;
    
    // If only one non-null status, return it
    if (count==1) {
      int i = 0;
      while (status==null && i < statuses.length)
        status = statuses[i];
      return status;
    }
    
    /* 2 or more non-null statuses, must create and merge a new status.
     * Start by copying out the non-null statuses */
    XStatus first = status;
    XStatus[] nonnulls = new XStatus[count-1];
    int i = 0;
    for (XStatus next : statuses) {
      if (first==null)
        first = next;
      else if (nonnulls[i]==null)
        nonnulls[i]=next;
      else
        nonnulls[++i]=next;
    }
    return new XStatus(first, nonnulls);
  }

  /**
   * Creates a new XStatus with one randomly generated Op ID and the same
   * task ID and options as this XStatus.
   * @return
   */
  public XStatus Next() {
    XStatus next = new XStatus(taskid);
    next.opid_length = opid_length;
    if (!options.isEmpty())
      next.options = new HashSet<OptionField>(options);
    next.previous = new byte[][] { XRandom.Generate(opid_length) };
    return next;
  }

}
