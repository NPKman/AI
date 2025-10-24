#property strict

#ifndef __REGIME_MQH__
#define __REGIME_MQH__

#include <MovingAverages.mqh>

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
   string m_symbol;
   ENUM_TIMEFRAMES m_tf;
   int    m_fast;
   int    m_slow;
   int    m_adx_period;
   double m_adx_threshold;
public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CRegimeDetector():m_symbol(""),m_tf(PERIOD_H1),m_fast(50),m_slow(200),m_adx_period(14),m_adx_threshold(20.0){}

   //+------------------------------------------------------------------+
   //| Initialize internal settings                                     |
   //+------------------------------------------------------------------+
   void Configure(const string symbol,const ENUM_TIMEFRAMES tf,const int fast,const int slow,const int adx_period,const double adx_threshold)
     {
      m_symbol=symbol;
      m_tf=tf;
      m_fast=fast;
      m_slow=slow;
      m_adx_period=adx_period;
      m_adx_threshold=adx_threshold;
     }

   //+------------------------------------------------------------------+
   //| Determine active trading regime                                  |
   //+------------------------------------------------------------------+
   ENUM_MARKET_REGIME Detect() const
     {
      if(m_symbol=="")
         return(REGIME_UNKNOWN);

      double ma_fast=iMA(m_symbol,m_tf,m_fast,0,MODE_EMA,PRICE_CLOSE,0);
      double ma_slow=iMA(m_symbol,m_tf,m_slow,0,MODE_EMA,PRICE_CLOSE,0);
      double adx=iADX(m_symbol,m_tf,m_adx_period,PRICE_CLOSE,MODE_MAIN,0);

      if(ma_fast==0.0 || ma_slow==0.0)
         return(REGIME_UNKNOWN);

      if(adx>=m_adx_threshold && MathAbs(ma_fast-ma_slow)>(SymbolInfoDouble(m_symbol,SYMBOL_POINT)*10))
         return(REGIME_TREND);

      return(REGIME_MEAN_REVERSION);
     }

   //+------------------------------------------------------------------+
   //| Convenience helpers exposing slope and relation                  |
   //+------------------------------------------------------------------+
   bool IsBullTrend() const
     {
      double ma_fast=iMA(m_symbol,m_tf,m_fast,0,MODE_EMA,PRICE_CLOSE,0);
      double ma_slow=iMA(m_symbol,m_tf,m_slow,0,MODE_EMA,PRICE_CLOSE,0);
      return(ma_fast>ma_slow);
     }

   bool IsBearTrend() const
     {
      double ma_fast=iMA(m_symbol,m_tf,m_fast,0,MODE_EMA,PRICE_CLOSE,0);
      double ma_slow=iMA(m_symbol,m_tf,m_slow,0,MODE_EMA,PRICE_CLOSE,0);
      return(ma_fast<ma_slow);
     }
  };

#endif // __REGIME_MQH__
