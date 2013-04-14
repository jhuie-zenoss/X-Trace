package edu.berkeley.xtrace.server;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.InetAddress;
import java.util.concurrent.BlockingQueue;
import java.io.Closeable;

import org.apache.log4j.Logger;

import edu.berkeley.xtrace.XTraceException;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

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

    public void TcpLocalDaemon() throws XTraceException {
        rwriter = new ReportFileWriter();
        String tcpportstr = System.getProperty("xtrace.backend.localproxy.tcpport", "7830");
        try {
            inPort = Integer.parseInt(tcpportstr);
        } catch (NumberFormatException nfe) {
            //Is this right approach to a misformed property string?
            LOG.warn("Invalid tcp report port for local proxy: " + tcpportstr, nfe);
            inPort = 7830;
        }

        try {
            serversock = new ServerSocket(inPort);
        } catch (IOException e) {
            throw new XTraceException("Unable to open TCP server socket for local proxy", e);
        }

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
    }

    public void run() {
        try {
            LOG.info("TcpReportSource started on port " + inPort);

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

    public final class ReportFileWriter {
        public final int CAPACITY = 5000;
        public final long TIMEOUT = 60;
        private String file;
        private FileWriter fwriter;
        private BufferedWriter bwriter;
        private ExecutorService executor;
        private final long executorTerminationTimeoutDuration = 60;

        protected ReportFileWriter() {
            this.file = System.getProperty("xtrace.backend.localproxy.file", "localproxyFile.txt");
            this.executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
                                                   new LinkedBlockingQueue<Runnable>(CAPACITY));
            try {
                this.fwriter = new FileWriter(this.file, true);
            } catch (IOException ioe) {
                throw new RuntimeException(ioe);
            }

            this.bwriter = new BufferedWriter(fwriter);
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
}
