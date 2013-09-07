#!/usr/local/bin/thrift -java

namespace java edu.berkeley.xtrace.localdaemon


service MasterService { 
        i64 registerDaemon(1: i32 port);
        void haveReportWithTaskID(1: i64 id, 2: string taskID);
}

