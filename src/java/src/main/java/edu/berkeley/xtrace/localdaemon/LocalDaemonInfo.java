package edu.berkeley.xtrace.localdaemon;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Set;
import java.util.HashSet;

public class LocalDaemonInfo {
    private Set<String> taskIDs;
    private long id;
    private int port;

    public LocalDaemonInfo() {
        this((long)(Math.random() * Long.MAX_VALUE), 0);
    }

    public LocalDaemonInfo(int port) {
        this((long)(Math.random() * Long.MAX_VALUE), port);
    }

    public LocalDaemonInfo(long id, int port) {
        this.taskIDs = new HashSet<String>();
        this.id = id;
        this.port = port;
    }

    public Set<String> getTaskIDs() {
        //TODO: return a copy
        return taskIDs;
    }

    // Should be fine on duplicates bx adding to set.
    public void addTaskID(String tid) {
        taskIDs.add(tid);
    }

    public long getId() {
        return id;
    }

    public int getPort() {
        return port;
    }
}
