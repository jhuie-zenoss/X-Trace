package edu.berkeley.xtrace.localdaemon;

import edu.berkeley.xtrace.XTraceException;

public class LocalDaemonStarter {
    public static void main(String args[]) {
        final TcpLocalDaemon tld = new TcpLocalDaemon();
        System.out.println("initalizing tld");
        try {
            tld.initialize();
        } catch (XTraceException xte) {
            System.err.println("Unable to initialize local daemon. Exiting.");
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
        System.out.println("Started tld thread");

        try {
            tldThread.join();
        } catch (Exception e) {}
    }
}
