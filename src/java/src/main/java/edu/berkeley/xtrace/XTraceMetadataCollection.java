package edu.berkeley.xtrace;

import java.util.Collection;
import java.util.Iterator;

import org.apache.commons.lang.NotImplementedException;

public class XTraceMetadataCollection implements Collection<XTraceMetadata> {
	
	private XTraceMetadata[] metadatas;
	private int size;
	
	/**
	 * A collection of XTrace Metadatas.  Small implementation here
	 * rather than using a Collection, since we know that for the most
	 * part, there will be only one metadata at a time.
	 */
	public XTraceMetadataCollection() {
		metadatas = new XTraceMetadata[2];
		size = 0;
	}

	@Override
	public boolean add(XTraceMetadata e) {
		if (e==null) {
			return false;
		}
		for (XTraceMetadata x : this) {
			if (x.equals(e)) {
				return false;
			}
		}
		if (metadatas.length==size) {
			expand();
		}
		metadatas[size] = e;
		size++;
		return true;
	}

	/**
	 * Adds some more space in the metadatas array
	 * @param scalefactor The amount to scale up the array by
	 */
	private void expand() {
		XTraceMetadata[] newmetadatas = new XTraceMetadata[2*size];
		System.arraycopy(metadatas, 0, newmetadatas, 0, size);
		metadatas = newmetadatas;
	}

	@Override
	public boolean addAll(Collection<? extends XTraceMetadata> c) {
		if (c==null) {
			return false;
		}
		
		// Add the elements one by one.  Not the best implementation, but want to detect duplicates
		boolean changed = false;
		for (XTraceMetadata m : c) {
			changed = add(m) || changed;
		}
		return changed;
	}

	@Override
	public void clear() {
		metadatas = new XTraceMetadata[2];
		size = 0;
	}

	@Override
	public boolean contains(Object o) {
		if (!(o instanceof XTraceMetadata)) {
			return false;
		}
		for (XTraceMetadata m : this) {
			if (m.equals(o)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public boolean containsAll(Collection<?> c) {
		for (Object o : c) {
			if (!contains(o)) {
				return false;
			}
		}
		return true;
	}

	@Override
	public boolean isEmpty() {
		return size == 0;
	}

	@Override
	public Iterator<XTraceMetadata> iterator() {
		return new Iterator<XTraceMetadata>() {
			int current = 0;
			@Override
			public boolean hasNext() { return current < size; }
			@Override
			public XTraceMetadata next() { current++; return metadatas[current-1]; }
			@Override
			public void remove() { throw new NotImplementedException(); }
		};
	}

	@Override
	public boolean remove(Object o) {
		for (int i = 0; i < metadatas.length; i++) {
			if (metadatas[i].equals(o)) {
				System.arraycopy(metadatas, i+1, metadatas, i, metadatas.length+1-i);
				size--;
				return true;
			}
		}
		return false;
	}

	@Override
	public boolean removeAll(Collection<?> c) {
		boolean changed = false;
		for (Object o : c) {
			changed = remove(o) || changed;
		}
		return changed;
	}

	@Override
	public boolean retainAll(Collection<?> c) {
		XTraceMetadata[] retained = new XTraceMetadata[size];
		int numRetained = 0;
		for (int i = 0; i < metadatas.length; i++) {
			if (c.contains(metadatas[i])) {
				retained[numRetained] = metadatas[i];
				numRetained++;
			}
		}
		boolean changed = size==numRetained;
		metadatas = retained;
		size = numRetained;
		return changed;
	}

	@Override
	public int size() {
		return size;
	}

	@Override
	public Object[] toArray() {
		Object[] elems = new Object[size];
		System.arraycopy(metadatas, 0, elems, 0, size);
		return elems;
	}

	@Override
	public <T> T[] toArray(T[] a) {
		return (T[]) toArray();
	}

}
