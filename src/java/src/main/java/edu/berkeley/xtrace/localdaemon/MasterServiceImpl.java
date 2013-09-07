package edu.berkeley.xtrace.localdaemon;

import org.apache.thrift.TException;
import java.util.Map;
import java.util.Collection;
import java.util.Random;

import org.apache.log4j.Logger;

public class MasterServiceImpl implements MasterService.Iface {

    private static final Logger LOG = Logger.getLogger(TcpLocalDaemon.class);

    public Map<Long, LocalDaemonInfo> daemons;
    public Random rand;

    public MasterServiceImpl(Map<Long, LocalDaemonInfo> daemons) {
        this.daemons = daemons;
        this.rand = new Random();
    }

    public long registerDaemon(int port) throws TException {
        long id = rand.nextLong();
        System.out.println("Register Daemon: (" + id + ", " + port + ")");
        daemons.put(id, new LocalDaemonInfo(id, port));
        return id;
    }

    public void haveReportWithTaskID(long id, String taskID) {
        if (!daemons.containsKey(id)) {
            LOG.error("haveReportsWithTaskID called with unknown daemonID: " + id);
            return;
        }

        LocalDaemonInfo info = daemons.get(id);
        info.addTaskID(taskID);
        System.out.println(id + ", " + taskID);
    }
}
