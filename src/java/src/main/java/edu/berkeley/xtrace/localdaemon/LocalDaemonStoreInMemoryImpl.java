package edu.berkeley.xtrace.localdaemon;

import java.util.List;
import java.util.Collection;
import java.util.LinkedList;
import java.util.Collections;
import edu.berkeley.xtrace.reporting.Report;
import edu.berkeley.xtrace.TaskID;
import edu.berkeley.xtrace.XTraceMetadata;
import java.util.concurrent.ConcurrentHashMap;

public class LocalDaemonStoreInMemoryImpl implements LocalDaemonStore {

    private ConcurrentHashMap<TaskID, Collection<Report>> reportMap;

    public LocalDaemonStoreInMemoryImpl() {
        this.reportMap = new ConcurrentHashMap<TaskID, Collection<Report>>();
    }

    public void storeReport(Report report) {
        TaskID tid = report.getMetadata().getTaskId();

        if (!reportMap.containsKey(tid)) {
            reportMap.put(tid, new LinkedList<Report>());
        }
        reportMap.get(tid).add(report);
    }


    public Collection<Report> getReportsForTaskId(TaskID tid) {
        if (reportMap.containsKey(tid)) {
            return reportMap.get(tid);
        } else {
            return Collections.emptyList();
        }
    }
}
