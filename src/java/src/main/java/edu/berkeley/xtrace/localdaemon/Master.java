package edu.berkeley.xtrace.localdaemon;

import org.apache.thrift.transport.TServerSocket;
import org.apache.thrift.transport.TSocket;
import org.apache.thrift.transport.TTransport;
import org.apache.thrift.transport.TServerTransport;
import org.apache.thrift.transport.TTransportException;
import org.apache.thrift.protocol.TBinaryProtocol;
import org.apache.thrift.protocol.TProtocol;
import org.apache.thrift.server.TServer;
import org.apache.thrift.server.TNonblockingServer;
import org.apache.thrift.server.TThreadPoolServer;
import org.apache.thrift.TException;

import edu.berkeley.xtrace.TaskID;
import edu.berkeley.xtrace.reporting.Report;


import java.io.Closeable;

import java.util.Collections;
import java.util.Collection;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;

import org.apache.log4j.Logger;


public class Master implements Closeable {
    private Map<Long, LocalDaemonInfo> daemons;
    private MasterServiceImpl serviceImpl;
    private TServerTransport serverTransport;
    private TServer server;

    private static final Logger LOG = Logger.getLogger(Master.class);

    public Master() {}

    public void close() {
        server.stop();
    }

    // return whether successful
    public boolean initialize() {
        daemons = Collections.synchronizedMap(new HashMap<Long, LocalDaemonInfo>());
        serviceImpl = new MasterServiceImpl(daemons);
        try {
            String portStr = System.getProperty("xtrace.backend.localproxy.masterPort",
                                                "7833");
            int masterPort = Integer.parseInt(portStr);
            serverTransport = new TServerSocket(masterPort);
        } catch (TTransportException tte) {
            LOG.warn("Unable to initialize server transport. Exiting.", tte);
            return false;
        } catch (NumberFormatException nfe) {
            LOG.warn("Unable to initialize server transport. Exiting.", nfe);
            return false;
        }

        server = new TThreadPoolServer(new TThreadPoolServer.Args(serverTransport).processor(new MasterService.Processor<MasterServiceImpl>(serviceImpl)));
        return true;
    }

    public void start() {
        new Thread() {
            @Override
            public void run() {
                server.serve();
            }
        }.start();
    }


    public Set<String> getTaskIDs() {
        Set<String> toReturn = new HashSet<String>();

        for (LocalDaemonInfo info : daemons.values()) {
            toReturn.addAll(info.getTaskIDs());
        }

        return toReturn;
    }

    // TODO: better to keep connections or make them occasionally?
    public Collection<String> getReportsForTaskId(String taskid) {
        ThriftTaskID tid = new ThriftTaskID();
        tid.setId(TaskID.createFromString(taskid).pack());

        Collection<ThriftReport> incomingReports = null;
        Collection<String> reportsToReturn = new LinkedList<String>();

        for (LocalDaemonInfo info : daemons.values()) {
            int port = info.getPort();

            // TODO: the port and the string should come from the clients in register
            TTransport transport = new TSocket("localhost", port);
            try {
                transport.open();
            } catch (TTransportException tte) {
                LOG.warn("Unable to open socket to local daemon.", tte);
                continue;
            }

            TProtocol protocol = new TBinaryProtocol(transport);
            LocalDaemonQueryService.Client client = new LocalDaemonQueryService.Client(protocol);

            try {
                incomingReports = client.getReportsForId(tid);
            } catch (TException te) {
                LOG.warn("Unable to get reports from client on port: " + port, te);
                continue;
            }

            for (ThriftReport tr : incomingReports) {
                reportsToReturn.add(tr.getReportStr());
            }

        }
        return reportsToReturn;
    }

}
