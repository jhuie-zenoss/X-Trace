package edu.berkeley.xtrace.localdaemon;

import edu.berkeley.xtrace.XTraceException;

import org.apache.log4j.Logger;

public class LocalDaemonStarter {
    private static final Logger LOG = Logger.getLogger(LocalDaemonStarter.class);

    public static void main(String args[]) {
        final TcpLocalDaemon tld = new TcpLocalDaemon();
        System.out.println("initalizing tld");
        try {
            tld.initialize();
        } catch (XTraceException xte) {
            LOG.warn("Unable to initialize local daemon. Exiting.");
            System.exit(1);
        }

        Runtime.getRuntime().addShutdownHook(new Thread() {
                @Override
                public void run() {
                    tld.close();
                }
            });

        Thread tldThread = new Thread(tld);
        tldThread.start();
        LOG.info("Started tld thread");

        try {
            tldThread.join();
        } catch (Exception e) {
            LOG.error("Exception joining on threads at close.", e);
        }
    }
}
