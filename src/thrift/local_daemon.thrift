#!/usr/local/bin/thrift -java

// namespace java edu.berkeley.xtrace.localdaemon

struct TaskID { 
       1: binary id;
}

struct Report { 
       1: string reportStr;
}

service LocalDaemonQueryService { 
        list<Report> getReportsFor(1:TaskID id);
}
