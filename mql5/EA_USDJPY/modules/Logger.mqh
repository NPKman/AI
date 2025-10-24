#property strict

#ifndef __LOGGER_MQH__
#define __LOGGER_MQH__

//+------------------------------------------------------------------+
//| Simple logger writing to Experts tab and optional CSV file       |
//+------------------------------------------------------------------+
class CLogger
  {
private:
   int    m_handle;
   bool   m_file_enabled;
   string m_file_name;
public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CLogger():m_handle(INVALID_HANDLE),m_file_enabled(false),m_file_name(""){}

   //+------------------------------------------------------------------+
   //| Initialize logger with optional file output                      |
   //+------------------------------------------------------------------+
   bool Init(const string file_name,const bool enable_file)
     {
      m_file_name=file_name;
      m_file_enabled=false;
      if(enable_file)
        {
         int handle=FileOpen(m_file_name,FILE_WRITE|FILE_READ|FILE_CSV|FILE_SHARE_READ|FILE_COMMON);
         if(handle==INVALID_HANDLE)
           {
            PrintFormat("[EA] Failed to open log file %s, error=%d",m_file_name,_LastError);
            return(false);
           }
         if(FileSize(handle)==0)
           {
            FileWrite(handle,"timestamp","level","event","message","extra");
           }
         FileSeek(handle,0,SEEK_END);
         m_handle=handle;
         m_file_enabled=true;
        }
      else
        {
         m_handle=INVALID_HANDLE;
        }
      return(true);
     }

   //+------------------------------------------------------------------+
   //| Log informational message                                        |
   //+------------------------------------------------------------------+
   void Info(const string event,const string message,const string extra="")
     {
      string text=StringFormat("[INFO] %s | %s",event,message);
      if(extra!="")
         text=StringFormat("%s | %s",text,extra);
      Print(text);
      WriteFile("INFO",event,message,extra);
     }

   //+------------------------------------------------------------------+
   //| Log warning message                                              |
   //+------------------------------------------------------------------+
   void Warn(const string event,const string message,const string extra="")
     {
      string text=StringFormat("[WARN] %s | %s",event,message);
      if(extra!="")
         text=StringFormat("%s | %s",text,extra);
      Print(text);
      WriteFile("WARN",event,message,extra);
     }

   //+------------------------------------------------------------------+
   //| Log error message                                                |
   //+------------------------------------------------------------------+
   void Error(const string event,const string message,const string extra="")
     {
      string text=StringFormat("[ERROR] %s | %s",event,message);
      if(extra!="")
         text=StringFormat("%s | %s",text,extra);
      Print(text);
      WriteFile("ERROR",event,message,extra);
     }

   //+------------------------------------------------------------------+
   //| Internal helper storing structured data                          |
   //+------------------------------------------------------------------+
   void WriteFile(const string level,const string event,const string message,const string extra)
     {
      if(!m_file_enabled || m_handle==INVALID_HANDLE)
         return;
      string time_str=TimeToString(TimeCurrent(),TIME_DATE|TIME_SECONDS);
      FileWrite(m_handle,time_str,level,event,message,extra);
      FileFlush(m_handle);
     }

   //+------------------------------------------------------------------+
   //| Close file handle                                                |
   //+------------------------------------------------------------------+
   void Shutdown()
     {
      if(m_handle!=INVALID_HANDLE)
        {
         FileFlush(m_handle);
         FileClose(m_handle);
         m_handle=INVALID_HANDLE;
        }
      m_file_enabled=false;
     }
  };

#endif // __LOGGER_MQH__
