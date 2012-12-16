package edu.berkeley.xtrace;

import java.util.ArrayList;
import java.util.Collection;

/**
 * For now, we just wrap an arraylist.  Ideally we would optimize so that clear
 * doesn't null the array each time, but whatever.
 * The only difference between this and ArrayList is that we do not allow
 * duplicates.
 * Even though add is a linear-time operation, we acknowledge that the vast
 * majority of the time this collection contains only a single element, so
 * it is faster than using a hashset
 * @author jon
 */


@SuppressWarnings("serial")
public class XTraceMetadataCollection extends ArrayList<XTraceMetadata> {
	
	public XTraceMetadataCollection() {
		super(2);
	}
	
	public XTraceMetadataCollection(XTraceMetadata... metadatas) {
		this();
		for (XTraceMetadata metadata : metadatas) {
			this.add(metadata);
		}
	}
	
	@Override
	public boolean add(XTraceMetadata e) {
		if (this.contains(e)) {
			return false;
		}
		return super.add(e);
	}
	
	@Override
	public void add(int index, XTraceMetadata e) {
		if (this.contains(e)) {
			return;
		}
		super.add(index, e);		
	}
	
	@Override
	public boolean addAll(Collection<? extends XTraceMetadata> c) {
		// Horrible implementation, but whatever
		boolean changed = false;
		for (XTraceMetadata m : c) {
			changed = add(m) || changed;
		}
		return changed;
	}
	
	@Override
	public boolean addAll(int index, Collection<? extends XTraceMetadata> c) {
		return this.addAll(c);
	}
}