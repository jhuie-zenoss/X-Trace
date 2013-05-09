#!/usr/local/bin/thrift -java

namespace java edu.berkeley.xtrace.localdaemon


service MasterService { 
        void registerDaemon(1:i64 id, 2: i16 port);
}