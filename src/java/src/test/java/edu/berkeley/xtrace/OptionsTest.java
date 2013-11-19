/*
 * Copyright (c) 2005,2006,2007 The Regents of the University of California.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the University of California, nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE UNIVERSITY OF CALIFORNIA ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


package edu.berkeley.xtrace;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Random;

import org.junit.Test;

/**
 * Make sure options are propagated through all propagation operations
 * @author jon
 */
public class OptionsTest {
  
    
  private static final byte TYPE = (byte)0xCE;
  
  private static XTraceMetadata newMD() {
    TaskID taskId = new TaskID(8);
    return new XTraceMetadata(taskId, 0L);
  }
  
  private static XTraceMetadata next(XTraceMetadata xtr) {
    XTraceEvent e = new XTraceEvent(xtr);
    e.addEdge(xtr);
    return e.getNewMetadata();
  }
  
  private static int randInt(int max) {
    return new Random().nextInt(max);
  }
  
  private static byte[] optionBytes(int numBytes) {
    byte[] bytes = new byte[numBytes];
    new Random().nextBytes(bytes);
    return bytes;
  }
  
  private static OptionField newOF(int size) {
    byte[] bytes = optionBytes(size);
    OptionField of = new OptionField(TYPE, bytes);
    return of;
  }
  

	/**
	 * Test method for {@link edu.berkeley.xtrace.XTraceMetadata#Metadata()}.
	 */
	@Test
	public void testNoOption() {
		XTraceMetadata xtr = newMD();
		assertNull(xtr.getOptions());
		
		XTraceMetadata next = next(xtr);
		assertNull(next.getOptions());
	}
	
	@Test
	public void testOptionPropagate() {
	  for (int size = 1; size < 256; size++) {
      XTraceMetadata xtr = newMD();
      assertNull(xtr.getOptions());
      
      OptionField of = newOF(size);
      assertEquals(of.getType(), TYPE);
      
      byte[] payload = of.getPayload();
      assertTrue(payload.length > 0);
      
      xtr.addOption(of);
      assertTrue(xtr.getOptions()!=null);
      assertEquals(1, xtr.getNumOptions());
      assertEquals(1, xtr.getOptions().length);
      assertEquals(of, xtr.getOptions()[0]);
      
      XTraceMetadata next = next(xtr);
      assertTrue(next.getOptions()!=null);
      assertEquals(1, next.getNumOptions());
      assertEquals(1, next.getOptions().length);
      assertEquals(of, next.getOptions()[0]);
      assertEquals(xtr.getOptions()[0], next.getOptions()[0]);
      
      XTraceContext.setThreadContext(next);
      assertTrue(XTraceContext.getOptions()!=null);
      assertEquals(1, XTraceContext.getOptions().length);
      assertEquals(of, XTraceContext.getOptions()[0]);
      assertEquals(xtr.getOptions()[0], XTraceContext.getOptions()[0]);
      assertEquals(next.getOptions()[0], XTraceContext.getOptions()[0]);
      
      XTraceMetadata fresh = newMD();
      XTraceContext.setThreadContext(fresh);
      assertEquals(null, XTraceContext.getOptions());
  
      XTraceContext.addOption(of);
  
      assertTrue(fresh.getOptions()!=null);
      assertEquals(1, fresh.getNumOptions());
      assertEquals(1, fresh.getOptions().length);
      assertEquals(of, fresh.getOptions()[0]);
      assertEquals(xtr.getOptions()[0], fresh.getOptions()[0]);
      
      assertTrue(XTraceContext.getOptions()!=null);
      assertEquals(1, XTraceContext.getOptions().length);
      assertEquals(of, XTraceContext.getOptions()[0]);
      assertEquals(xtr.getOptions()[0], XTraceContext.getOptions()[0]);
      assertEquals(next.getOptions()[0], XTraceContext.getOptions()[0]);
      assertEquals(fresh.getOptions()[0], XTraceContext.getOptions()[0]);
	  }
	}
	
	@Test
	public void testOptionSerialize() {
    for (int size = 1; size < 254; size++) {
      XTraceMetadata xtr = newMD();
      String strRep_before = xtr.toString();
      String op_before = xtr.getOpIdString();
      assertNull(xtr.getOptions());
      
      OptionField of = newOF(size);
      assertEquals(of.getType(), TYPE);

      byte[] payload = of.getPayload();
      assertTrue(payload.length > 0);
      
      xtr.addOption(of);
      assertTrue(xtr.getOptions()!=null);
      assertEquals(1, xtr.getNumOptions());
      assertEquals(1, xtr.getOptions().length);
      assertEquals(of, xtr.getOptions()[0]);
      
      String strRep_after = xtr.toString();
      String op_after = xtr.getOpIdString();
      assertFalse(strRep_after.equals(strRep_before));
      assertEquals(op_before, op_after);
      
      XTraceMetadata next = XTraceMetadata.createFromString(strRep_after);
      assertEquals(xtr, next);
      assertEquals(strRep_after, next.toString());
      assertFalse(strRep_after.equals(strRep_before));
      assertEquals(op_before, next.getOpIdString());

      assertTrue(next.getOptions()!=null);
      assertEquals(1, next.getNumOptions());
      assertEquals(1, next.getOptions().length);
      assertEquals(of, next.getOptions()[0]);
      
      next = XTraceMetadata.createFromBytes(xtr.pack());
      assertEquals(xtr, next);
      assertEquals(strRep_after, next.toString());
      assertFalse(strRep_after.equals(strRep_before));
      assertEquals(op_before, next.getOpIdString());

      assertTrue(next.getOptions()!=null);
      assertEquals(1, next.getNumOptions());
      assertEquals(1, next.getOptions().length);
      assertEquals(of, next.getOptions()[0]);
      
      
      
    }
    
	}
	
}
