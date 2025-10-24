#property strict

#ifndef __UTILS_MQH__
#define __UTILS_MQH__

//+------------------------------------------------------------------+
//| Utility namespace encapsulating helper routines                 |
//+------------------------------------------------------------------+
namespace Utils
  {
   //+------------------------------------------------------------------+
   //| Return pip size derived from broker settings                    |
   //+------------------------------------------------------------------+
   double PipSize(const string symbol)
     {
      double point=SymbolInfoDouble(symbol,SYMBOL_POINT);
      int    digits=(int)SymbolInfoInteger(symbol,SYMBOL_DIGITS);
      if(point<=0.0 || digits<=0)
         return(0.0);
      // For most JPY pairs one pip equals 0.01 -> 100 points when 3 decimal
      if(digits==3 || digits==1)
         return(point*10.0);
      return(point);
     }

   //+------------------------------------------------------------------+
   //| Normalize volume according to symbol specification              |
   //+------------------------------------------------------------------+
   double NormalizeVolume(const string symbol,const double volume)
     {
      double vol_min=SymbolInfoDouble(symbol,SYMBOL_VOLUME_MIN);
      double vol_step=SymbolInfoDouble(symbol,SYMBOL_VOLUME_STEP);
      double vol_max=SymbolInfoDouble(symbol,SYMBOL_VOLUME_MAX);

      if(vol_min<=0.0 || vol_step<=0.0)
         return(0.0);

      double normalized=MathFloor((volume-vol_min)/vol_step+0.5)*vol_step+vol_min;
      normalized=MathMax(vol_min,MathMin(vol_max,normalized));
      return(NormalizeDouble(normalized,(int)SymbolInfoInteger(symbol,SYMBOL_VOLUME_DIGITS)));
     }

   //+------------------------------------------------------------------+
   //| Determine if server time lies inside user configured window     |
   //+------------------------------------------------------------------+
   bool IsWithinTimeWindow(const bool enabled,const int start_hour,const int end_hour)
     {
      if(!enabled)
         return(true);

      datetime now=TimeCurrent();
      int hour=(int)TimeHour(now);

      if(start_hour<=end_hour)
         return(hour>=start_hour && hour<end_hour);

      // Overnight window: e.g. 22 -> 6
      if(hour>=start_hour || hour<end_hour)
         return(true);
      return(false);
     }

   //+------------------------------------------------------------------+
   //| Helper struct storing bar state for one-trade-per-bar control   |
   //+------------------------------------------------------------------+
   class CBarState
     {
    private:
      datetime m_last_bar_time;
    public:
      //+------------------------------------------------------------------+
      //| Constructor initializes last bar time                          |
      //+------------------------------------------------------------------+
      CBarState():m_last_bar_time(0){}

      //+------------------------------------------------------------------+
      //| Update internal bar time and check if new bar formed            |
      //+------------------------------------------------------------------+
      bool IsNewBar(const string symbol,const ENUM_TIMEFRAMES tf)
        {
         datetime current=iTime(symbol,tf,0);
         if(current==0)
            return(false);
         if(current!=m_last_bar_time)
           {
            m_last_bar_time=current;
            return(true);
           }
         return(false);
        }
     };
  }

#endif // __UTILS_MQH__
