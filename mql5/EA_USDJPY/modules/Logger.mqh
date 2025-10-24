#property strict

#ifndef __LOGGER_MQH__
#define __LOGGER_MQH__

#include <Files\FileTxt.mqh>

//+------------------------------------------------------------------+
//| Simple logger writing to Experts tab and optional CSV file       |
//+------------------------------------------------------------------+
class CLogger
  {
private:
   CTextFile m_file;
   bool      m_file_enabled;
   string    m_file_name;
public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CLogger():m_file_enabled(false),m_file_name(""){}

   //+------------------------------------------------------------------+
   //| Initialize logger with optional file output                      |
   //+------------------------------------------------------------------+
   bool Init(const string file_name,const bool enable_file)
     {
      m_file_enabled=false;
      m_file_name=file_name;
      if(enable_file)
        {
         string path=TerminalInfoString(TERMINAL_DATA_PATH)+"\\MQL5\\Files\\"+file_name;
         if(m_file.Open(path,FILE_WRITE|FILE_CSV|FILE_SHARE_READ))
           {
            m_file_enabled=true;
            m_file.WriteString("timestamp,event,message,extra");
            m_file.WriteString("\n");
            m_file.Flush();
           }
         else
           {
            PrintFormat("[EA] Failed to open log file %s",path);
           }
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
      if(!m_file_enabled)
         return;
      string time_str=TimeToString(TimeCurrent(),TIME_DATE|TIME_SECONDS);
      m_file.WriteString(StringFormat("%s,%s,%s,%s,%s\n",time_str,level,event,message,extra));
      m_file.Flush();
     }

   //+------------------------------------------------------------------+
   //| Close file handle                                                |
   //+------------------------------------------------------------------+
   void Shutdown()
     {
      if(m_file_enabled)
        {
         m_file.Close();
         m_file_enabled=false;
        }
     }
  };

#endif // __LOGGER_MQH__
