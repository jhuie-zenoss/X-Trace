package edu.berkeley.xtrace;

import java.util.Collection;


/**
 * An X-Trace process, returned from
 * {@link XTraceContext#startProcess(String, String)}.
 * 
 * For use with the {@link XTraceContext#startProcess(String, String)} and
 * {@link XTraceContext#endProcess(XTraceProcess)} methods.
 * 
 * @see XTraceContext#startProcess(String, String)
 * @see XTraceContext#endProcess(XTraceProcess)
 * 
 * @author Matei Zaharia
 */
public class XTraceProcess {
	final Collection<XTraceMetadata> startCtx;
	final String agent;
	final String name;
	final Class<?> msgclass;

	XTraceProcess(Collection<XTraceMetadata> startCtx, String agent, String name) {
		this(XTraceLogLevel.DEFAULT, startCtx, agent, name);
	}

	XTraceProcess(Class<?> msgclass, Collection<XTraceMetadata> startCtx, String agent, String name) {
		this.msgclass = msgclass;
		this.startCtx = startCtx;
		this.agent = agent;
		this.name = name;
	}

	public Collection<XTraceMetadata> getContext() {
		return startCtx;
	}
}
