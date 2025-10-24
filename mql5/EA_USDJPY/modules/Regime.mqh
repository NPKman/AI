#property strict

#ifndef __REGIME_MQH__
#define __REGIME_MQH__

//+------------------------------------------------------------------+
//| Enumeration describing possible trading regimes                  |
//+------------------------------------------------------------------+
enum ENUM_MARKET_REGIME
  {
   REGIME_UNKNOWN=0,
   REGIME_TREND,
   REGIME_MEAN_REVERSION
  };

//+------------------------------------------------------------------+
//| Regime detector encapsulating moving averages and ADX logic       |
//+------------------------------------------------------------------+
class CRegimeDetector
  {
private:
   string           m_symbol;
   ENUM_TIMEFRAMES  m_tf;
   int              m_fast;
   int              m_slow;
   int              m_adx_period;
   double           m_adx_threshold;
   int              m_handle_ma_fast;
   int              m_handle_ma_slow;
   int              m_handle_adx;

   bool CopyValue(const int handle,const int buffer,double &value) const
     {
      if(handle==INVALID_HANDLE)
         return(false);
      double data[1];
      if(CopyBuffer(handle,buffer,0,1,data)!=1)
         return(false);
      value=data[0];
      return(true);
     }

   void Release()
     {
      if(m_handle_ma_fast!=INVALID_HANDLE)
         IndicatorRelease(m_handle_ma_fast);
      if(m_handle_ma_slow!=INVALID_HANDLE)
         IndicatorRelease(m_handle_ma_slow);
      if(m_handle_adx!=INVALID_HANDLE)
         IndicatorRelease(m_handle_adx);
      m_handle_ma_fast=INVALID_HANDLE;
      m_handle_ma_slow=INVALID_HANDLE;
      m_handle_adx=INVALID_HANDLE;
     }

public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CRegimeDetector():m_symbol(""),m_tf(PERIOD_H1),m_fast(50),m_slow(200),m_adx_period(14),m_adx_threshold(20.0),
                     m_handle_ma_fast(INVALID_HANDLE),m_handle_ma_slow(INVALID_HANDLE),m_handle_adx(INVALID_HANDLE){}

   //+------------------------------------------------------------------+
   //| Destructor                                                       |
   //+------------------------------------------------------------------+
   ~CRegimeDetector()
     {
      Release();
     }

   //+------------------------------------------------------------------+
   //| Initialize internal settings                                     |
   //+------------------------------------------------------------------+
   bool Configure(const string symbol,const ENUM_TIMEFRAMES tf,const int fast,const int slow,const int adx_period,const double adx_threshold)
     {
      Release();
      m_symbol=symbol;
      m_tf=tf;
      m_fast=fast;
      m_slow=slow;
      m_adx_period=adx_period;
      m_adx_threshold=adx_threshold;

      m_handle_ma_fast=iMA(m_symbol,m_tf,m_fast,0,MODE_EMA,PRICE_CLOSE);
      m_handle_ma_slow=iMA(m_symbol,m_tf,m_slow,0,MODE_EMA,PRICE_CLOSE);
      m_handle_adx=iADX(m_symbol,m_tf,m_adx_period);

      if(m_handle_ma_fast==INVALID_HANDLE || m_handle_ma_slow==INVALID_HANDLE || m_handle_adx==INVALID_HANDLE)
        {
         Release();
         return(false);
        }
      return(true);
     }

   //+------------------------------------------------------------------+
   //| Determine active trading regime                                  |
   //+------------------------------------------------------------------+
   ENUM_MARKET_REGIME Detect() const
     {
      if(m_symbol=="" || m_handle_ma_fast==INVALID_HANDLE)
         return(REGIME_UNKNOWN);

      double ma_fast=0.0,ma_slow=0.0,adx_main=0.0;
      if(!CopyValue(m_handle_ma_fast,0,ma_fast) || !CopyValue(m_handle_ma_slow,0,ma_slow) || !CopyValue(m_handle_adx,0,adx_main))
         return(REGIME_UNKNOWN);

      if(ma_fast==0.0 || ma_slow==0.0)
         return(REGIME_UNKNOWN);

      if(adx_main>=m_adx_threshold && MathAbs(ma_fast-ma_slow)>(SymbolInfoDouble(m_symbol,SYMBOL_POINT)*10.0))
         return(REGIME_TREND);

      return(REGIME_MEAN_REVERSION);
     }

   //+------------------------------------------------------------------+
   //| Convenience helpers exposing slope and relation                  |
   //+------------------------------------------------------------------+
   bool IsBullTrend() const
     {
      double ma_fast=0.0,ma_slow=0.0;
      if(!CopyValue(m_handle_ma_fast,0,ma_fast) || !CopyValue(m_handle_ma_slow,0,ma_slow))
         return(false);
      return(ma_fast>ma_slow);
     }

   bool IsBearTrend() const
     {
      double ma_fast=0.0,ma_slow=0.0;
      if(!CopyValue(m_handle_ma_fast,0,ma_fast) || !CopyValue(m_handle_ma_slow,0,ma_slow))
         return(false);
      return(ma_fast<ma_slow);
     }
  };

#endif // __REGIME_MQH__
