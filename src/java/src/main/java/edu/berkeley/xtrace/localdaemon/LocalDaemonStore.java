package edu.berkeley.xtrace.localdaemon;

import java.util.Collection;
import edu.berkeley.xtrace.reporting.Report;
import edu.berkeley.xtrace.TaskID;

public interface LocalDaemonStore {

    public void storeReport(Report report);

    public Collection<Report> getReportsForTaskId (TaskID tid);
}
