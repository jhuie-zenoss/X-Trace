/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package edu.brown.cs.systems.htrace;

import edu.berkeley.xtrace.XTraceContext;
import edu.berkeley.xtrace.XTraceMetadata;


/**
 * Wrap a Runnable with a Span that survives a change in threads.
 */
public class TraceRunnable implements Runnable {

    private final byte[] parent; // xtrace TaskID
    private final Runnable runnable;
    private final String description;

    public TraceRunnable(Runnable runnable) {
        this(XTraceContext.logMerge().pack(), runnable);
    }

    public TraceRunnable(byte[] xtrace, Runnable runnable) {
        this(xtrace, runnable, null);
    }

    public TraceRunnable(byte[] xtrace, Runnable runnable, String description) {
        this.parent = xtrace;
        this.runnable = runnable;
        this.description = description;
    }

    @Override
    public void run() {
        if (parent != null) {
            XTraceContext.joinContext(XTraceMetadata.createFromBytes(parent, 0, parent.length));
            XTraceSpan chunk = XTraceSpanTrace.startSpan(getDescription());

            try {
                runnable.run();
            } finally {
                chunk.stop();
            }
        } else {
            runnable.run();
        }
    }

    private String getDescription() {
        return this.description == null ? Thread.currentThread().getName() : description;
    }
}
