#!/usr/local/bin/thrift -java

namespace java edu.berkeley.xtrace.localdaemon

struct ThriftTaskID { 
       1: binary id;
}

struct ThriftReport { 
       1: string reportStr;
}

service LocalDaemonQueryService { 
        list<ThriftReport> getReportsForId(1:ThriftTaskID id);
}
