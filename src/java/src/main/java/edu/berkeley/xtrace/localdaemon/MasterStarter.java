package edu.berkeley.xtrace.localdaemon;

import asg.cliche.Command;
import asg.cliche.ShellFactory;
import java.io.IOException;

public class MasterStarter {
    private static Master master;

    public static void main(String args[]) throws IOException{

        master = new Master();
        if (!master.initialize()) {
            System.err.println("Error creating master. Exiting.");
            System.exit(1);
        }

        Runtime.getRuntime().addShutdownHook(new Thread() {
                @Override
                public void run() {
                    master.close();
                }
            });
        master.start();
        ShellFactory.createConsoleShell("master", "", new MasterStarter()).commandLoop();
    }

    @Command
    public static void printReportsForTaskId(String taskid) {
        for (String s : master.getReportsForTaskId(taskid)) {
            System.out.println(s);
        }
    }
}
