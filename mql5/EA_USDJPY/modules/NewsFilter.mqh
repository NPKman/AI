#property strict

#ifndef __NEWS_FILTER_MQH__
#define __NEWS_FILTER_MQH__

#include "Logger.mqh"

//+------------------------------------------------------------------+
//| Stub news filter to be integrated with external feeds later      |
//+------------------------------------------------------------------+
class CNewsFilter
  {
private:
   bool     m_enabled;
   int      m_buffer_before;
   int      m_buffer_after;
   CLogger *m_logger;
public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CNewsFilter():m_enabled(false),m_buffer_before(30),m_buffer_after(30),m_logger(NULL){}

   //+------------------------------------------------------------------+
   //| Configure filter                                                 |
   //+------------------------------------------------------------------+
   void Configure(const bool enabled,const int buffer_before,const int buffer_after,CLogger *logger)
     {
      m_enabled=enabled;
      m_buffer_before=buffer_before;
      m_buffer_after=buffer_after;
      m_logger=logger;
     }

   //+------------------------------------------------------------------+
   //| Determine whether trading should be blocked                     |
   //+------------------------------------------------------------------+
   bool ShouldBlock(const datetime now)
     {
      if(!m_enabled)
         return(false);
      // Placeholder: integrate with calendar feed via CSV/API later
      static datetime last_notice=0;
      if(m_logger!=NULL && (now-last_notice)>300)
        {
         m_logger.Warn("NewsFilter","No news source configured - trading paused");
         last_notice=now;
        }
      return(true);
     }
  };

#endif // __NEWS_FILTER_MQH__
