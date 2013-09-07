package edu.berkeley.xtrace.localdaemon;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.concurrent.BlockingQueue;
import java.io.Closeable;

import org.apache.log4j.Logger;

import edu.berkeley.xtrace.XTraceException;
import edu.berkeley.xtrace.reporting.Report;
import edu.berkeley.xtrace.TaskID;

import java.io.BufferedWriter;
import java.util.Collection;
import java.io.FileWriter;
import java.util.HashMap;
import java.io.IOException;
import java.util.List;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.apache.thrift.transport.TServerSocket;
import org.apache.thrift.transport.TSocket;
import org.apache.thrift.transport.TTransport;
import org.apache.thrift.transport.TServerTransport;
import org.apache.thrift.transport.TTransportException;
import org.apache.thrift.protocol.TBinaryProtocol;
import org.apache.thrift.protocol.TProtocol;
import org.apache.thrift.server.TServer;
import org.apache.thrift.server.TThreadPoolServer;
import org.apache.thrift.TException;


/**
 * Reads tcp xtrace reports, logs them locally and then forwards them
 * along to the main server.
 */

//Should this implement ReportSource interface? it kind of is one
public class TcpLocalDaemon implements Closeable, Runnable {

    // should this use threadpool for sending? reporter just uses raw threads
    // initially will just read, log and forward in the one helper thread


    private static final Logger LOG = Logger.getLogger(TcpLocalDaemon.class);
    private static final int MAX_REPORT_LENGTH = 256*1024;

    private int inPort;
    private ReportFileWriter rwriter;
    private BlockingQueue<String> q;
    private DataOutputStream out;

    //used to get the reports
    private ServerSocket serversock;
    //used to send reports to central server
    private Socket sockToServer;

    private LocalDaemonStore store;

    // stuff for the thrift server
    // TODO: this needs to be thread-safe set
    private final Set<String> taskIDs;
    private int thriftPort;
    private LocalDaemonQueryServiceImpl thriftQueryImpl;
    private TServerTransport serverTransport;
    private TServer thriftServer;
    private MasterService.Client client;
    private long id; //unique id to identify with server (could be port?)

    public TcpLocalDaemon() {
        this.store = new LocalDaemonStoreInMemoryImpl();
        this.taskIDs = new HashSet<String>();
        this.rwriter = new ReportFileWriter();
        String tcpportstr = System.getProperty("xtrace.backend.localproxy.tcpport", "7830");

        try {
            this.inPort = Integer.parseInt(tcpportstr);
        } catch (NumberFormatException nfe) {
            //Is this right approach to a misformed property string?
            LOG.warn("Invalid tcp report port for local proxy: " + tcpportstr, nfe);
            this.inPort = 7830;
        }
    }

    private boolean setupThrift() {
        // set up our server
        thriftQueryImpl = new LocalDaemonQueryServiceImpl(store);
        ServerSocket ssock;

        try {
            ssock = new ServerSocket(0);
            serverTransport = new TServerSocket(ssock);

        } catch (IOException e) {
            LOG.warn("Unable to create server socket for Local Daemon thrift server.", e);
            return false;
        }

        LOG.info("Starting thrift server.");
        System.out.println("starting thrift server");
        thriftServer = new TThreadPoolServer(new TThreadPoolServer.Args(serverTransport).processor(new LocalDaemonQueryService.Processor<LocalDaemonQueryServiceImpl>(thriftQueryImpl)));
        new Thread() {
            @Override
            public void run() {
                thriftServer.serve();
            }
        }.start();

        System.out.println("started thrift server");

        LOG.info("Started thrift server.");
        // now our server should be set up

        // now we need to tell the master about us

        String masterPortStr = System.getProperty("xtrace.backend.localproxy.masterPort", "7833");
        int masterPort = Integer.parseInt(masterPortStr);
        // Default to localhost
        String masterHost = System.getProperty("xtrace.backend.localproxy.masterHost",
                                               "127.0.0.1");
        TTransport transport = new TSocket(masterHost, masterPort);

        try {
            transport.open();
        } catch(TTransportException tte) {
            LOG.warn("Unable to create socket for connection to master.", tte);
            return false;
        }

        TProtocol protocol = new TBinaryProtocol(transport);
        this.client = new MasterService.Client(protocol);

        try {
            this.id = client.registerDaemon(ssock.getLocalPort());
        } catch (TException te) {
            LOG.warn("Unable to tell master about local daemons existence.", te);
            return false;
        }
        System.out.println("intialized");
        return true;
    }

    public void initialize() throws XTraceException {
        LOG.warn("intializing");
        try {
            serversock = new ServerSocket(inPort);
        } catch (IOException e) {
            LOG.warn("1234ioexception coming through could not open serversock:  " + inPort + e.getMessage());
            throw new XTraceException("Unable to open TCP server socket for local proxy", e);
        }
        setupSocketToServer();
        LOG.info("About to setup thrift.");

        if (!setupThrift()) {
            LOG.warn("Unable to setup thrift for local daemon.");
        }

        LOG.info("Initialized local daemon correctly.");
    }

    private void setupSocketToServer() throws XTraceException{
        InetAddress host = null;
        int port = 0;
        String tcpDest = System.getProperty("xtrace.tcpdest", "127.0.0.1:7831");

        try {
            String[] split = tcpDest.split(":");
            host = InetAddress.getByName(split[0]);
            port = Integer.parseInt(split[1]);
        } catch (Exception e) {
            LOG.warn("Invalid xtrace.tcpdest property. Expected host:port.", e);
            System.exit(1);
        }

        try {
            sockToServer = new Socket(host, port);
            // TODO: Maybe use BufferedOutputStream? In that case, make sure
            // to call flush() periodically for timely reporting.
            out = new DataOutputStream(sockToServer.getOutputStream());

        } catch (Exception se) {
            LOG.warn("Failed to create X-Trace TCP socket", se);
            sockToServer = null;
        }

    }

    public void close() {
        try {
            serversock.close();
        } catch (IOException e) {
            LOG.warn("Unable to close TCP server socket", e);
        }
        try {
            sockToServer.close();
        } catch (IOException e) {
            LOG.warn("Unable to close TCP server socket", e);
        }
        rwriter.close();
    }

    public void run() {
        try {
            LOG.info("TcpReportSource started on port " + inPort);
            LOG.info("serversock: " + serversock);
            while (true) {
                Socket sock = serversock.accept();
                new TcpClientHandler(sock).start();
            }
        } catch(IOException e) {
            LOG.warn("Error while accepting a TCP client", e);
        }
    }

    private final class TcpClientHandler extends Thread {
        private Socket sock;

        public TcpClientHandler (Socket sock) {
            this.sock = sock;
        }

        public void run() {
            Report toSend;

            try {
                LOG.info("Starting TcpClientHandler for "
                         + sock.getInetAddress() + ":" + sock.getPort());

                byte[] buf = new byte[MAX_REPORT_LENGTH];
                DataInputStream in = new DataInputStream(sock.getInputStream());
                while (true) {
                    int length = in.readInt();
                    if (length <= 0 || length > MAX_REPORT_LENGTH) {
                        LOG.info("Closing ReadReportsThread for "
                                 + sock.getInetAddress() + ":" + sock.getPort()
                                 + " due to bad length: " + length);
                        sock.close();
                        return;
                    }
                    in.readFully(buf, 0, length);
                    String message = new String(buf, 0, length, "UTF-8");
                    toSend = Report.createFromString(message);
                    store.storeReport(toSend);
                    String tidStr = toSend.getMetadata().getTaskId().toString();

                    if (!taskIDs.contains(tidStr)) {
                        client.haveReportWithTaskID(id, tidStr);
                        taskIDs.add(tidStr);
                    }
                    rwriter.writeOut(message);
                }
            } catch(EOFException e) {
                LOG.info("Closing ReadReportsThread for "
                         + sock.getInetAddress() + ":" + sock.getPort()
                         + " normally (EOF)");
            } catch(Exception e) {
                LOG.warn("Closing ReadReportsThread for "
                         + sock.getInetAddress() + ":" + sock.getPort(), e);
            }

        }
    }

    public final class ReportFileWriter implements Closeable{
        public final int CAPACITY = 5000;
        public final long TIMEOUT = 60;
        private String file;
        private FileWriter fwriter;
        private BufferedWriter bwriter;
        private ExecutorService executor;
        private final long executorTerminationTimeoutDuration = 60;

        protected ReportFileWriter() {
            this.file = System.getProperty("xtrace.backend.localproxy.file", "/vagrant/localreports/localproxyFile.txt");
            this.file += Math.random();
            this.executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
                                                   new LinkedBlockingQueue<Runnable>(CAPACITY));
            try {
                this.fwriter = new FileWriter(this.file, true);
            } catch (IOException ioe) {
                throw new RuntimeException(ioe);
            }

            this.bwriter = new BufferedWriter(fwriter);
        }

        public void close() {
            executor.shutdown();

            try {
                bwriter.close();
            } catch (IOException e) {
                LOG.warn("Error closing buffered writer.");
            }

            try {
                fwriter.close();
            } catch (IOException e) {
                LOG.warn("Error closing buffered writer.");
            }
        }

        //assumes initialized, bad assumption?
        private void writeOut(String msg) {
            executor.submit(new ReportFileWriterRunnable(msg));
        }

        private final class ReportFileWriterRunnable implements Runnable{
            public final String msg;

            public ReportFileWriterRunnable(String msg) {
                this.msg = msg;
            }

            @Override
            public void run() {
                try {
                    bwriter.write(msg);
                    bwriter.flush();
                } catch (IOException e) {
                    LOG.error("Error when writing to file: " + file, e);
                }
                try {
                    byte[] bytes = msg.getBytes("UTF-8");
                    out.writeInt(bytes.length);
                    out.write(bytes);
                } catch (IOException e) {
                    LOG.error("Error when forwarding to central server: ", e);
                }
            }
        }
    }

    private class LocalDaemonQueryServiceImpl implements LocalDaemonQueryService.Iface {
        private LocalDaemonStore store;

        public LocalDaemonQueryServiceImpl(LocalDaemonStore store) {
            this.store = store;
        }

        public List<ThriftReport> getReportsForId(ThriftTaskID id) throws TException {
            TaskID tid = TaskID.createFromBytes(id.getId(), 0, id.getId().length);
            Collection<Report> reports = store.getReportsForTaskId(tid);
            List<ThriftReport> toReturn = new LinkedList<ThriftReport>();

            for (Report r : reports) {
                toReturn.add(new ThriftReport(r.toString()));
            }

            return toReturn;
        }
    }
}
