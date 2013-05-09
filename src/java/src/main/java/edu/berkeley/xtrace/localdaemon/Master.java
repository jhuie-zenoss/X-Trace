package edu.berkeley.xtrace.localdaemon;

import org.apache.thrift.transport.TServerSocket;
import org.apache.thrift.transport.TServerTransport;
import org.apache.thrift.transport.TTransportException;
import org.apache.thrift.server.TServer;
import org.apache.thrift.server.TThreadPoolServer;




import java.util.Collections;
import java.util.Collection;
import java.util.HashSet;


public class Master {
    private Collection<Short> daemons;
    private MasterServiceImpl serviceImpl;
    private TServerTransport serverTransport;
    private TServer server;


    public Master() {

    }

    public static void main(String args[]){
    }

    // return whether successful
    public boolean initialize() {
        daemons = Collections.synchronizedCollection(new HashSet<Short>());
        serviceImpl = new MasterServiceImpl(daemons);
        try {
            // this should be a property
            serverTransport = new TServerSocket(7832);
        } catch (TTransportException tte) {
            System.err.println("Unable to initialize server transport. Exiting.");
            return false;
        }

        server = new TThreadPoolServer(new TThreadPoolServer.Args(serverTransport));
        server.serve();
        return true;

    }

}
