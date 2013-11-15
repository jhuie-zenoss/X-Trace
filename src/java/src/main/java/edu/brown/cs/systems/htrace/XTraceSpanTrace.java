package edu.brown.cs.systems.htrace;

import edu.berkeley.xtrace.XTraceContext;
import edu.berkeley.xtrace.XTraceMetadata;

public class XTraceSpanTrace {
    public static final String START_SPAN_STRING = "S";
    public static final String END_SPAN_STRING = "E";
    public static final String SPAN_FIELDKEY = "SPAN";
    public static final String SPAN_AGENT = "XTRACE_SPAN";
    public static final String NO_DESC_GIVEN = "null";

    public static void startSpan(String description) {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, description,
                               SPAN_FIELDKEY, START_SPAN_STRING);
    }

    public static void startSpan(String description, byte[] parent) {
        if (parent != null) {
            XTraceMetadata xmd = XTraceMetadata.createFromBytes(parent,
                                                                0,
                                                                parent.length);
            if (xmd.isValid()) {
                XTraceContext.setThreadContext(xmd);
            }
        }

        startSpan(description);
    }

    public static void stopSpan() {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, NO_DESC_GIVEN,
                               SPAN_FIELDKEY, END_SPAN_STRING);
    }

    public static void stopSpan(String description) {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, description,
                               SPAN_FIELDKEY, END_SPAN_STRING);
    }

    public static Runnable wrap(Runnable runnable) {
        // TODO: check if tracing here and do nothing if not
        return new TraceRunnable(runnable);
    }

    public static Runnable wrap(String description, Runnable runnable) {
        // TODO: check if tracing here and do nothing if not
        // TODO: what should this be
        return new TraceRunnable(null, runnable, description);
    }
}
