package edu.berkeley.xtrace.impl;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.HashSet;

import edu.berkeley.xtrace.IoUtil;
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
  private static final byte METADATA_VERSION = 1;
  
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
  XStatus() {
    this(new TaskID(DEFAULT_TASKID_LENGTH));
  }
  
  XStatus(TaskID taskid) {
    this.taskid = taskid;
  }
  
  XStatus(TaskID taskid, byte[] opid) {
    this.taskid = taskid;
    this.previous = new byte[][] { opid };
  }
  
  XStatus(TaskID taskid, int opid) {
    this(taskid, ByteBuffer.allocate(4).putInt(opid).array());
  }
  
  XStatus(TaskID taskid, long opid) {
    this(taskid, ByteBuffer.allocate(8).putLong(opid).array());
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
  
  /**
   * Returns the byte representation of this XStatus.  This is not a public method
   * and should only be called if this XStatus has a single parent.
   * @return
   */
  byte[] byteRepr() {
    final ByteBuffer buf = ByteBuffer.allocate(1024);

    /* flags */
    byte flags = 0;

    switch (taskid.get().length) {
    case 4:
      flags = (byte) 0x00;
      break;
    case 8:
      flags = (byte) 0x01;
      break;
    case 12:
      flags = (byte) 0x02;
      break;
    case 20:
      flags = (byte) 0x03;
      break;
    default:
      // shouldn't happen
    }

    flags |= (METADATA_VERSION << 4);

    if (options.size() > 0)
      flags |= 0x04;

    if (opid_length == 8)
      flags |= 0x08;

    buf.put(flags);

    /* TaskID */
    buf.put(taskid.pack());

    /* OpId */
    buf.put(previous[0]);

    /* Options */
    if (options.size() > 0) {
      int optLenPosition = buf.position();
      byte totalOptLength = 0;

      /* A placeholder for the total options length byte */
      buf.put((byte) 0);

      /* Options */
      for (OptionField opt : options) {
        byte[] optBytes = opt.pack();
        totalOptLength += optBytes.length;
        buf.put(optBytes);
      }

      /* Now go back and figure out how big the total options length is */
      buf.put(optLenPosition, totalOptLength);
    }

    /* return the flipped buffer */
    buf.flip();
    
    final byte[] ar = new byte[buf.limit()];
    buf.get(ar);
    return ar;
  }

  
  /**
   * Returns the string representation of this XStatus.  This is not a public method
   * and should only be called if this XStatus has a single parent.
   * @return
   */
  String stringRepr() {
    try {
      return IoUtil.bytesToString(byteRepr());
    } catch (final IOException e) {
      return null;
    }
  }
  
  public void addOption(OptionField o) {
    this.options = new HashSet<OptionField>(this.options);
    this.options.add(o);
  }
  
  public static XStatus fromBytes(byte[] bytes) {
    return XStatus.fromBytes(bytes, 0, bytes.length);
  }
  
  /**
   * Constructs an XStatus from the provided byte representation.
   * @return An XStatus object, or null if not valid
   */
  public static XStatus fromBytes(byte[] bytes, int offset, int length) {
    if (bytes == null || offset < 0 || length < 9 || (bytes.length - offset) < length)
      return null;
    
    // Task ID length
    int taskIdLength = 0;
    switch (bytes[0] & 0x03) {
    case 0x00:
      taskIdLength = 4;
      break;
    case 0x01:
      taskIdLength = 8;
      break;
    case 0x02:
      taskIdLength = 12;
      break;
    case 0x03:
      taskIdLength = 20;
      break;
    default:
        // Can't happen
    }
    
    // OpId length
    int opIdLength;
    if ((bytes[0] & 0x08) != 0) {
      opIdLength = 8;
    } else {
      opIdLength = 4;
    }
    
    // Make sure the flags don't imply a length that is too long
    if (taskIdLength + opIdLength > length)
      return null;
    
    // Create the TaskID and opId fields
    TaskID taskid = TaskID.createFromBytes(bytes, 1, taskIdLength);
    byte[] opIdBytes = new byte[opIdLength];
    System.arraycopy(bytes, 1+taskIdLength, opIdBytes, 0, opIdLength);
    
    XStatus status = new XStatus(taskid);
    status.opid_length = opIdLength;
    status.previous = new byte[][] { opIdBytes };
    
    // If no options, we're done
    if ( (bytes[0] & 0x04) == 0 )
      return status;
    
    // Otherwise, read in the total option length
    if (length <= 1 + taskIdLength + opIdLength)
      return null;
    
    int totOptLen = bytes[1 + taskIdLength + opIdLength];
    int optPtr = offset + 1 + taskIdLength + opIdLength + 1;
    
    while (totOptLen >= 2) {
      byte type = bytes[optPtr++];
      byte len = bytes[optPtr++];
      if (len > totOptLen) {
        //LOG.warn("Invalid option length");
        break;
      }
      
      OptionField o;
      if (len > 0) {
        o = OptionField.createFromBytes(bytes, optPtr, len);
      } else {
        o = new OptionField(type, null);
      }
      status.addOption(o);
      totOptLen -= (2 + len);
      optPtr += (2 + len);
    }
    return status;
  }
  
  /**
   * Constructs an XStatus from the provdied String representation.
   * @param string An XStatus object, or null if not valid
   * @return
   */
  public static XStatus fromString(String str) {
    if (str == null)
      return null;
    
    byte[] bytes;
    try {
      bytes = IoUtil.stringToBytes(str);
    } catch (IOException e) {
      return null;
    }
    return XStatus.fromBytes(bytes);
  }

}
