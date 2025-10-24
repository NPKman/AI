#property strict

#ifndef __SIGNALS_MQH__
#define __SIGNALS_MQH__

#include "Regime.mqh"

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
   string          m_symbol;
   ENUM_TIMEFRAMES m_tf;
   int             m_rsi_period;
   int             m_bb_period;
   double          m_bb_dev;
   int             m_adx_period;
   double          m_adx_threshold;
   int             m_fast_ma;
   int             m_slow_ma;
   int             m_atr_period;

   int             m_handle_adx;
   int             m_handle_ma_fast;
   int             m_handle_ma_slow;
   int             m_handle_atr;
   int             m_handle_bbands;
   int             m_handle_rsi;

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
      if(m_handle_adx!=INVALID_HANDLE)
         IndicatorRelease(m_handle_adx);
      if(m_handle_ma_fast!=INVALID_HANDLE)
         IndicatorRelease(m_handle_ma_fast);
      if(m_handle_ma_slow!=INVALID_HANDLE)
         IndicatorRelease(m_handle_ma_slow);
      if(m_handle_atr!=INVALID_HANDLE)
         IndicatorRelease(m_handle_atr);
      if(m_handle_bbands!=INVALID_HANDLE)
         IndicatorRelease(m_handle_bbands);
      if(m_handle_rsi!=INVALID_HANDLE)
         IndicatorRelease(m_handle_rsi);
      m_handle_adx=INVALID_HANDLE;
      m_handle_ma_fast=INVALID_HANDLE;
      m_handle_ma_slow=INVALID_HANDLE;
      m_handle_atr=INVALID_HANDLE;
      m_handle_bbands=INVALID_HANDLE;
      m_handle_rsi=INVALID_HANDLE;
     }

public:
   //+------------------------------------------------------------------+
   //| Constructor                                                      |
   //+------------------------------------------------------------------+
   CSignalEngine():m_symbol(""),m_tf(PERIOD_H1),m_rsi_period(14),m_bb_period(20),m_bb_dev(2.0),m_adx_period(14),m_adx_threshold(18.0),
                   m_fast_ma(50),m_slow_ma(200),m_atr_period(14),
                   m_handle_adx(INVALID_HANDLE),m_handle_ma_fast(INVALID_HANDLE),m_handle_ma_slow(INVALID_HANDLE),
                   m_handle_atr(INVALID_HANDLE),m_handle_bbands(INVALID_HANDLE),m_handle_rsi(INVALID_HANDLE){}

   ~CSignalEngine()
     {
      Release();
     }

   //+------------------------------------------------------------------+
   //| Configure signal engine                                          |
   //+------------------------------------------------------------------+
   bool Configure(const string symbol,const ENUM_TIMEFRAMES tf,const int rsi_period,const int bb_period,const double bb_dev,
                  const int adx_period,const double adx_threshold,const int fast_ma,const int slow_ma,const int atr_period)
     {
      Release();
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

      m_handle_adx=iADX(m_symbol,m_tf,m_adx_period);
      m_handle_ma_fast=iMA(m_symbol,m_tf,m_fast_ma,0,MODE_EMA,PRICE_CLOSE);
      m_handle_ma_slow=iMA(m_symbol,m_tf,m_slow_ma,0,MODE_EMA,PRICE_CLOSE);
      m_handle_atr=iATR(m_symbol,m_tf,m_atr_period);
      m_handle_bbands=iBands(m_symbol,m_tf,m_bb_period,m_bb_dev,0,PRICE_CLOSE);
      m_handle_rsi=iRSI(m_symbol,m_tf,m_rsi_period,PRICE_CLOSE);

      if(m_handle_adx==INVALID_HANDLE || m_handle_ma_fast==INVALID_HANDLE || m_handle_ma_slow==INVALID_HANDLE ||
         m_handle_atr==INVALID_HANDLE || m_handle_bbands==INVALID_HANDLE || m_handle_rsi==INVALID_HANDLE)
        {
         Release();
         return(false);
        }
      return(true);
     }

   //+------------------------------------------------------------------+
   //| Latest ATR value                                                 |
   //+------------------------------------------------------------------+
   double LatestATR() const
     {
      double value=0.0;
      if(!CopyValue(m_handle_atr,0,value))
         return(0.0);
      return(value);
     }

   //+------------------------------------------------------------------+
   //| Generate signal for trend regime                                 |
   //+------------------------------------------------------------------+
   TradeSignal GenerateTrendSignal(const bool allow_long,const bool allow_short,const double sl_mult,const double tp_rr,
                                   const bool use_trail,const double trail_mult) const
     {
      TradeSignal signal;
      if(m_symbol=="")
         return(signal);

      double adx=0.0,ma_fast=0.0,ma_slow=0.0,atr=0.0;
      if(!CopyValue(m_handle_adx,0,adx) || !CopyValue(m_handle_ma_fast,0,ma_fast) ||
         !CopyValue(m_handle_ma_slow,0,ma_slow) || !CopyValue(m_handle_atr,0,atr))
         return(signal);

      if(adx<m_adx_threshold || ma_fast==0.0 || ma_slow==0.0 || atr<=0.0)
         return(signal);

      double price_close=iClose(m_symbol,m_tf,0);
      double prev_high=iHigh(m_symbol,m_tf,1);
      double prev_low=iLow(m_symbol,m_tf,1);
      double current_low=iLow(m_symbol,m_tf,0);
      double current_high=iHigh(m_symbol,m_tf,0);

      if(allow_long && ma_fast>ma_slow && price_close>ma_fast && current_low<=ma_fast && iClose(m_symbol,m_tf,0)>prev_high)
        {
         signal.direction=SIGNAL_LONG;
         signal.entry_price=price_close;
         signal.atr_value=atr;
         signal.stop_price=price_close-(atr*sl_mult);
         signal.target_price=price_close+(atr*sl_mult*tp_rr);
         signal.use_trailing=use_trail;
        }

      if(allow_short && ma_fast<ma_slow && price_close<ma_fast && current_high>=ma_fast && iClose(m_symbol,m_tf,0)<prev_low)
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
   TradeSignal GenerateMeanSignal(const bool allow_long,const bool allow_short,const double sl_mult,const double tp_rr,
                                  const bool use_trail,const double trail_mult,const bool avoid_strong_trend) const
     {
      TradeSignal signal;
      if(m_symbol=="")
         return(signal);

      double bb_mid=0.0,bb_upper=0.0,bb_lower=0.0,rsi=0.0,atr=0.0,adx=0.0;
      if(!CopyValue(m_handle_bbands,0,bb_mid) || !CopyValue(m_handle_bbands,1,bb_upper) || !CopyValue(m_handle_bbands,2,bb_lower))
         return(signal);
      if(!CopyValue(m_handle_rsi,0,rsi) || !CopyValue(m_handle_atr,0,atr))
         return(signal);
      if(avoid_strong_trend && !CopyValue(m_handle_adx,0,adx))
         return(signal);

      if(avoid_strong_trend && adx>=m_adx_threshold)
         return(signal);

      if(bb_mid==0.0 || atr<=0.0)
         return(signal);

      double price_close=iClose(m_symbol,m_tf,0);
      double open_price=iOpen(m_symbol,m_tf,0);

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
