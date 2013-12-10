package edu.brown.cs.systems.htrace;

import edu.berkeley.xtrace.XTraceMetadata;

/**
 * Currently just a holder for XTraceMetadata's, but may become more later.
 */
public class XTraceSpan {
    private String parentOpId;
    // TODO: any of this need to be synchronized?

    public XTraceSpan(XTraceMetadata xmd) {
        this.parentOpId = xmd.getOpIdString();
    }

    public XTraceSpan(String parentOpId) {
        this.parentOpId = parentOpId;
    }

    public String getParentOpId() {
        return parentOpId;
    }

    public void stop() {
        XTraceSpanTrace.stopSpan(this);
    }
}
