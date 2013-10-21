package edu.berkeley.xtrace3.repr;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Random;

/**
 * Generates random bytes for X-Trace Task IDs and X-Trace Op IDs
 * @author jon
 */
public class XRandom {
  
  private static ThreadLocal<XRandom> thread_rand = new ThreadLocal<XRandom>() {
    @Override
    protected XRandom initialValue() { return new XRandom(); }
  };

  private static volatile long count = 0;
  private static final int process = ManagementFactory.getRuntimeMXBean().getName().hashCode();
  private static final int host;
  static {
    int inetaddr_hostname_hashcode = 0;
    try {
      inetaddr_hostname_hashcode = InetAddress.getLocalHost().getHostName().hashCode();
    } catch (UnknownHostException e) {
      inetaddr_hostname_hashcode = 0;
    } finally {
      host = inetaddr_hostname_hashcode;
    }
  }
  
  private Random random;
  
  private XRandom() {
    long seed = ++count + process + host + System.nanoTime() + Thread.currentThread().getId();
    random = new Random(seed);
  }
  
  /**
   * Randomly generates a byte array of the specified length
   * @param length the length of the byte array to generate
   * @return a byte array of the specified length
   */
  private byte[] generate(int length) {
    byte[] bytes = new byte[length];
    random.nextBytes(bytes);
    return bytes;
  }
  
  public static byte[] Generate(int length) {
    return thread_rand.get().generate(length);
  }

}
