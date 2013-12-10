package edu.brown.cs.systems.htrace;

import org.apache.log4j.Logger;

import edu.berkeley.xtrace.XTraceContext;
import edu.berkeley.xtrace.XTraceEvent;
import edu.berkeley.xtrace.XTraceMetadata;
import edu.berkeley.xtrace.TaskID;

import edu.berkeley.xtrace.config.XTraceConfiguration;
import edu.berkeley.xtrace.config.XTraceLogLevel;

import java.util.Collection;

public class XTraceSpanTrace {
    private static final Logger LOG = Logger.getLogger(XTraceMetadata.class);

    public static final String START_SPAN_STRING = "S";
    public static final String END_SPAN_STRING = "E";
    public static final String START_SPAN_FIELDKEY = "START_SPAN";
    public static final String END_SPAN_FIELDKEY = "END_SPAN";
    public static final String SPAN_AGENT = "XTRACE_SPAN";
    public static final String NO_DESC_GIVEN = "null";

    public static XTraceSpan startSpan(String description) {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, description,
                               START_SPAN_FIELDKEY, START_SPAN_STRING);
        Collection<XTraceMetadata> xmdCol = XTraceContext.getThreadContext(null);

        if (xmdCol.size() != 1) {
            LOG.warn("Multiple XTraceMetadata's not supported for spans.");
        }

        return new XTraceSpan(xmdCol.iterator().next().getOpIdString());
    }

    public static XTraceSpan startTrace(String agent, String description) {
        if (!XTraceConfiguration.ENABLED) {
            // TODO: have a null xtracespan to return here?
            return null;
        }

        Class<?> msgclass = XTraceLogLevel.DEFAULT;

        if (!XTraceContext.isValid()) {
            TaskID taskId = new TaskID(8);
            XTraceContext.setThreadContext(new XTraceMetadata(taskId, 0L));
            msgclass = XTraceLogLevel.ALWAYS; // always log a proper start event
        }

        XTraceEvent event = XTraceContext.createEvent(msgclass, agent, description);
        if (msgclass==XTraceLogLevel.ALWAYS) {
            event.put("Operation", "starttrace");
        }
        event.put(START_SPAN_FIELDKEY, START_SPAN_STRING);
        event.sendReport();

        Collection<XTraceMetadata> xmdCol = XTraceContext.getThreadContext(null);

        if (xmdCol.size() != 1) {
            LOG.warn("Multiple XTraceMetadata's not supported for spans.");
        }

        return new XTraceSpan(xmdCol.iterator().next().getOpIdString());
    }

    public static XTraceSpan startSpan(String description, byte[] parent) {
        if (parent != null) {
            XTraceMetadata xmd = XTraceMetadata.createFromBytes(parent,
                                                                0,
                                                                parent.length);
            if (xmd.isValid()) {
                XTraceContext.setThreadContext(xmd);
            }
        }

        return startSpan(description);
    }

    public static void stopSpan() {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, NO_DESC_GIVEN,
                               END_SPAN_FIELDKEY, END_SPAN_STRING);
    }

    public static void stopSpan(XTraceSpan toStop) {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, NO_DESC_GIVEN,
                               END_SPAN_FIELDKEY, toStop.getParentOpId());
    }

    public static void stopSpan(String description) {
        XTraceContext.logEvent(XTraceSpan.class, SPAN_AGENT, description,
                               END_SPAN_FIELDKEY, END_SPAN_STRING);
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
