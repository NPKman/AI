#property strict

#ifndef __SIGNALS_MQH__
#define __SIGNALS_MQH__

#include "Regime.mqh"
#include <Trade\Trade.mqh>

//+------------------------------------------------------------------+
//| Signal type                                                       |
//+------------------------------------------------------------------+
enum ENUM_SIGNAL_DIRECTION
  {
   SIGNAL_NONE=0,
   SIGNAL_LONG,
   SIGNAL_SHORT
  };

//+------------------------------------------------------------------+
//| Structure representing trade signal                               |
//+------------------------------------------------------------------+
struct TradeSignal
  {
   ENUM_SIGNAL_DIRECTION direction;
   double entry_price;
   double stop_price;
   double target_price;
   double atr_value;
   bool   use_trailing;

   TradeSignal():direction(SIGNAL_NONE),entry_price(0.0),stop_price(0.0),target_price(0.0),atr_value(0.0),use_trailing(false){}
  };

//+------------------------------------------------------------------+
//| Signal engine combining trend and mean-reversion logic            |
//+------------------------------------------------------------------+
class CSignalEngine
  {
private:
   string m_symbol;
   ENUM_TIMEFRAMES m_tf;
   int    m_rsi_period;
   int    m_bb_period;
   double m_bb_dev;
   int    m_adx_period;
   double m_adx_threshold;
   int    m_fast_ma;
   int    m_slow_ma;
   double m_atr_period;

public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CSignalEngine():m_symbol(""),m_tf(PERIOD_H1),m_rsi_period(14),m_bb_period(20),m_bb_dev(2.0),m_adx_period(14),m_adx_threshold(18.0),m_fast_ma(50),m_slow_ma(200),m_atr_period(14){}

   //+------------------------------------------------------------------+
   //| Configure signal engine                                          |
   //+------------------------------------------------------------------+
   void Configure(const string symbol,const ENUM_TIMEFRAMES tf,const int rsi_period,const int bb_period,const double bb_dev,const int adx_period,const double adx_threshold,const int fast_ma,const int slow_ma,const double atr_period)
     {
      m_symbol=symbol;
      m_tf=tf;
      m_rsi_period=rsi_period;
      m_bb_period=bb_period;
      m_bb_dev=bb_dev;
      m_adx_period=adx_period;
      m_adx_threshold=adx_threshold;
      m_fast_ma=fast_ma;
      m_slow_ma=slow_ma;
      m_atr_period=atr_period;
     }

   //+------------------------------------------------------------------+
   //| Generate signal for trend regime                                 |
   //+------------------------------------------------------------------+
   TradeSignal GenerateTrendSignal(const bool allow_long,const bool allow_short,const double sl_mult,const double tp_rr,const bool use_trail,const double trail_mult) const
     {
      TradeSignal signal;
      if(m_symbol=="")
         return(signal);

      double adx=iADX(m_symbol,m_tf,m_adx_period,PRICE_CLOSE,MODE_MAIN,0);
      double ma_fast=iMA(m_symbol,m_tf,m_fast_ma,0,MODE_EMA,PRICE_CLOSE,0);
      double ma_slow=iMA(m_symbol,m_tf,m_slow_ma,0,MODE_EMA,PRICE_CLOSE,0);
      double price_close=iClose(m_symbol,m_tf,0);
      double prev_high=iHigh(m_symbol,m_tf,1);
      double prev_low=iLow(m_symbol,m_tf,1);
      double atr=iATR(m_symbol,m_tf,(int)m_atr_period,0);

      if(adx<m_adx_threshold || ma_fast==0.0 || ma_slow==0.0 || atr<=0.0)
         return(signal);

      if(allow_long && ma_fast>ma_slow && price_close>ma_fast && iLow(m_symbol,m_tf,0)<=ma_fast && iClose(m_symbol,m_tf,0)>prev_high)
        {
         signal.direction=SIGNAL_LONG;
         signal.entry_price=price_close;
         signal.atr_value=atr;
         signal.stop_price=price_close-(atr*sl_mult);
         signal.target_price=price_close+(atr*sl_mult*tp_rr);
         signal.use_trailing=use_trail;
        }

      if(allow_short && ma_fast<ma_slow && price_close<ma_fast && iHigh(m_symbol,m_tf,0)>=ma_fast && iClose(m_symbol,m_tf,0)<prev_low)
        {
         signal.direction=SIGNAL_SHORT;
         signal.entry_price=price_close;
         signal.atr_value=atr;
         signal.stop_price=price_close+(atr*sl_mult);
         signal.target_price=price_close-(atr*sl_mult*tp_rr);
         signal.use_trailing=use_trail;
        }

      return(signal);
     }

   //+------------------------------------------------------------------+
   //| Generate signal for mean reversion regime                        |
   //+------------------------------------------------------------------+
   TradeSignal GenerateMeanSignal(const bool allow_long,const bool allow_short,const double sl_mult,const double tp_rr,const bool use_trail,const double trail_mult,const bool avoid_strong_trend) const
     {
      TradeSignal signal;
      if(m_symbol=="")
         return(signal);

      double bb_mid=iBands(m_symbol,m_tf,m_bb_period,m_bb_dev,0,PRICE_CLOSE,MODE_MAIN,0);
      double bb_upper=iBands(m_symbol,m_tf,m_bb_period,m_bb_dev,0,PRICE_CLOSE,MODE_UPPER,0);
      double bb_lower=iBands(m_symbol,m_tf,m_bb_period,m_bb_dev,0,PRICE_CLOSE,MODE_LOWER,0);
      double rsi=iRSI(m_symbol,m_tf,m_rsi_period,PRICE_CLOSE,0);
      double atr=iATR(m_symbol,m_tf,(int)m_atr_period,0);
      double price_close=iClose(m_symbol,m_tf,0);
      double open_price=iOpen(m_symbol,m_tf,0);
      double adx=iADX(m_symbol,m_tf,m_adx_period,PRICE_CLOSE,MODE_MAIN,0);
      bool strong_trend=(adx>=m_adx_threshold && avoid_strong_trend);

      if(bb_mid==0.0 || bb_upper==0.0 || bb_lower==0.0 || atr<=0.0)
         return(signal);

      if(strong_trend)
         return(signal);

      if(allow_long && price_close<=bb_lower && rsi<30.0 && price_close>open_price)
        {
         signal.direction=SIGNAL_LONG;
         signal.entry_price=price_close;
         signal.atr_value=atr;
         signal.stop_price=price_close-(atr*sl_mult);
         signal.target_price=bb_mid+(atr*tp_rr*0.5);
         signal.use_trailing=use_trail;
        }

      if(allow_short && price_close>=bb_upper && rsi>70.0 && price_close<open_price)
        {
         signal.direction=SIGNAL_SHORT;
         signal.entry_price=price_close;
         signal.atr_value=atr;
         signal.stop_price=price_close+(atr*sl_mult);
         signal.target_price=bb_mid-(atr*tp_rr*0.5);
         signal.use_trailing=use_trail;
        }

      return(signal);
     }
  };

#endif // __SIGNALS_MQH__
