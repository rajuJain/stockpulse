-- ═══════════════════════════════════════════════════════════════════════════
-- StockPulse — MySQL 8.0 Complete Schema
-- ═══════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS stockpulse CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stockpulse;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_log, notifications, payments, watchlist, follows,
  post_likes, posts, tips, subscriptions, plans, sebi_verifications,
  refresh_tokens, shareholding, quarterly_results, fundamentals,
  stock_prices, stocks, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ───────────────────────────────────────────────────────────────────────────
-- USERS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120)  NOT NULL,
  handle            VARCHAR(50)   NOT NULL UNIQUE,
  email             VARCHAR(255)  NOT NULL UNIQUE,
  phone             VARCHAR(20)   NULL,
  password_hash     VARCHAR(255)  NOT NULL,
  avatar_url        VARCHAR(500)  NULL,
  bio               TEXT          NULL,
  role              ENUM('user','admin')          NOT NULL DEFAULT 'user',
  status            ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  sebi              BOOLEAN       NOT NULL DEFAULT FALSE,
  reg_no            VARCHAR(50)   NULL,
  sebi_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  accuracy          DECIMAL(5,2)  NULL,
  streak            INT           NOT NULL DEFAULT 0,
  points            INT           NOT NULL DEFAULT 0,
  followers_count   INT           NOT NULL DEFAULT 0,
  email_verified_at DATETIME      NULL,
  last_login_at     DATETIME      NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_status (role, status),
  INDEX idx_users_sebi (sebi, sebi_verified),
  INDEX idx_users_handle (handle),
  INDEX idx_users_accuracy (accuracy DESC)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- REFRESH TOKENS (JWT rotation)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255)    NOT NULL UNIQUE,
  device_info VARCHAR(255)    NULL,
  expires_at  DATETIME        NOT NULL,
  revoked_at  DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tokens_user (user_id),
  INDEX idx_tokens_expires (expires_at)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- SEBI VERIFICATION REQUESTS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE sebi_verifications (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  reg_no         VARCHAR(50)     NOT NULL,
  cert_url       VARCHAR(500)    NULL,
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by    BIGINT UNSIGNED NULL,
  review_notes   TEXT            NULL,
  submitted_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at    DATETIME        NULL,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sebi_status (status, submitted_at),
  INDEX idx_sebi_user (user_id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- PLANS (analyst paid subscriptions — SEBI-verified users only)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE plans (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL UNIQUE,
  name            VARCHAR(120)    NOT NULL,
  description     TEXT            NULL,
  price           DECIMAL(10,2)   NOT NULL,
  billing_cycle   ENUM('monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
  max_subs        INT             NOT NULL DEFAULT 100,
  focus           JSON            NULL,      -- ["Daily Calls","Swing Trades",...]
  perks           JSON            NULL,      -- ["2-3 calls daily","SL & target",...]
  active          BOOLEAN         NOT NULL DEFAULT TRUE,
  subscriber_count INT            NOT NULL DEFAULT 0,
  total_revenue   DECIMAL(15,2)   NOT NULL DEFAULT 0,
  razorpay_plan_id VARCHAR(100)   NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_plans_active (active, price),
  INDEX idx_plans_revenue (total_revenue DESC)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subscriber_id  BIGINT UNSIGNED NOT NULL,
  plan_id        BIGINT UNSIGNED NOT NULL,
  analyst_id     BIGINT UNSIGNED NOT NULL,
  status         ENUM('active','cancelled','expired','paused') NOT NULL DEFAULT 'active',
  started_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_end    DATETIME        NOT NULL,
  cancelled_at   DATETIME        NULL,
  razorpay_sub_id VARCHAR(100)   NULL,
  FOREIGN KEY (subscriber_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)       REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (analyst_id)    REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_subscriber_analyst (subscriber_id, analyst_id, status),
  INDEX idx_subs_subscriber (subscriber_id, status),
  INDEX idx_subs_analyst (analyst_id, status),
  INDEX idx_subs_expiry (current_end, status)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- STOCKS (master data)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE stocks (
  ticker         VARCHAR(20)  PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  sector         VARCHAR(100) NULL,
  industry       VARCHAR(100) NULL,
  exchange       VARCHAR(10)  NOT NULL DEFAULT 'NSE',
  is_index       BOOLEAN      NOT NULL DEFAULT FALSE,
  current_price  DECIMAL(12,2) NULL,
  day_change_pct DECIMAL(6,2)  NULL,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stocks_sector (sector)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- STOCK PRICES (partitioned by ticker for OHLCV range scans)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE stock_prices (
  ticker VARCHAR(20)   NOT NULL,
  date   DATE          NOT NULL,
  open   DECIMAL(12,2) NOT NULL,
  high   DECIMAL(12,2) NOT NULL,
  low    DECIMAL(12,2) NOT NULL,
  close  DECIMAL(12,2) NOT NULL,
  volume BIGINT        NOT NULL,
  PRIMARY KEY (ticker, date),
  INDEX idx_prices_date (date)
) ENGINE=InnoDB
PARTITION BY KEY(ticker) PARTITIONS 8;

-- ───────────────────────────────────────────────────────────────────────────
-- FUNDAMENTALS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE fundamentals (
  ticker              VARCHAR(20)   PRIMARY KEY,
  market_cap          VARCHAR(30)   NULL,
  pe_ratio            DECIMAL(8,2)  NULL,
  pb_ratio            DECIMAL(8,2)  NULL,
  eps                 DECIMAL(10,2) NULL,
  book_value          DECIMAL(10,2) NULL,
  debt_to_equity      DECIMAL(6,2)  NULL,
  current_ratio       DECIMAL(6,2)  NULL,
  roe                 DECIMAL(6,2)  NULL,
  roce                DECIMAL(6,2)  NULL,
  dividend_yield      DECIMAL(5,2)  NULL,
  face_value          DECIMAL(6,2)  NULL,
  week_52_high        DECIMAL(12,2) NULL,
  week_52_low         DECIMAL(12,2) NULL,
  revenue             VARCHAR(30)   NULL,
  net_profit          VARCHAR(30)   NULL,
  ebitda              VARCHAR(30)   NULL,
  ebitda_margin       VARCHAR(20)   NULL,
  net_profit_margin   VARCHAR(20)   NULL,
  analyst_target      DECIMAL(12,2) NULL,
  rating              ENUM('BUY','HOLD','SELL','NEUTRAL') NULL,
  description         TEXT          NULL,
  raw_data            JSON          NULL,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- SHAREHOLDING
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE shareholding (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticker          VARCHAR(20)  NOT NULL,
  quarter         VARCHAR(10)  NOT NULL,
  promoter_pct    DECIMAL(5,2) NOT NULL,
  fii_pct         DECIMAL(5,2) NOT NULL,
  dii_pct         DECIMAL(5,2) NOT NULL,
  public_pct      DECIMAL(5,2) NOT NULL,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticker_quarter (ticker, quarter),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- QUARTERLY RESULTS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE quarterly_results (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticker      VARCHAR(20)  NOT NULL,
  quarter     VARCHAR(10)  NOT NULL,
  revenue     DECIMAL(15,2) NULL,
  net_profit  DECIMAL(15,2) NULL,
  ebitda      DECIMAL(15,2) NULL,
  yoy_growth  VARCHAR(10)  NULL,
  reported_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticker_quarter (ticker, quarter),
  FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE,
  INDEX idx_quarters_ticker (ticker, quarter DESC)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- TIPS (stock calls)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE tips (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  ticker      VARCHAR(20)     NOT NULL,
  tip_type    ENUM('daily','swing','longterm') NOT NULL,
  entry       DECIMAL(12,2)   NULL,
  target      DECIMAL(12,2)   NOT NULL,
  sl          DECIMAL(12,2)   NULL,
  horizon     VARCHAR(10)     NOT NULL,
  sentiment   ENUM('bull','bear','neutral') NOT NULL,
  reason      TEXT            NULL,
  is_paid     BOOLEAN         NOT NULL DEFAULT FALSE,
  status      ENUM('open','target_hit','sl_hit','expired') NOT NULL DEFAULT 'open',
  result      ENUM('win','loss') NULL,
  exit_price  DECIMAL(12,2)   NULL,
  resolved_at DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker)  REFERENCES stocks(ticker) ON DELETE CASCADE,
  INDEX idx_tips_ticker_type (ticker, tip_type, is_paid),
  INDEX idx_tips_user_ts (user_id, created_at DESC),
  INDEX idx_tips_status (status, created_at DESC),
  INDEX idx_tips_feed (created_at DESC)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- POSTS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NOT NULL,
  content        TEXT            NOT NULL,
  tip_id         BIGINT UNSIGNED NULL,
  likes_count    INT             NOT NULL DEFAULT 0,
  comments_count INT             NOT NULL DEFAULT 0,
  is_deleted     BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tip_id)  REFERENCES tips(id) ON DELETE SET NULL,
  INDEX idx_posts_feed (created_at DESC, is_deleted),
  INDEX idx_posts_user (user_id, created_at DESC),
  FULLTEXT INDEX ft_posts_content (content)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- POST LIKES
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE post_likes (
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- WATCHLIST
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE watchlist (
  user_id    BIGINT UNSIGNED NOT NULL,
  ticker     VARCHAR(20)     NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, ticker),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ticker)  REFERENCES stocks(ticker) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- FOLLOWS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE follows (
  follower_id BIGINT UNSIGNED NOT NULL,
  followee_id BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_follows_followee (followee_id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- PAYMENTS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subscription_id   BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  amount            DECIMAL(10,2)   NOT NULL,
  gst_amount        DECIMAL(10,2)   NOT NULL,
  total             DECIMAL(10,2)   NOT NULL,
  currency          CHAR(3)         NOT NULL DEFAULT 'INR',
  method            VARCHAR(30)     NULL,        -- upi, card, netbanking
  razorpay_order_id VARCHAR(100)    NOT NULL UNIQUE,
  razorpay_payment_id VARCHAR(100)  NULL,
  status            ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  paid_at           DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pay_user (user_id, status, created_at DESC),
  INDEX idx_pay_status (status, created_at)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(40)     NOT NULL,   -- tip_new, subscription_renewed, sebi_approved
  title      VARCHAR(200)    NOT NULL,
  body       TEXT            NULL,
  data       JSON            NULL,
  read_at    DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, read_at, created_at DESC)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- AUDIT LOG (SEBI compliance)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id    BIGINT UNSIGNED NULL,
  action      VARCHAR(50)     NOT NULL,
  entity_type VARCHAR(40)     NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  metadata    JSON            NULL,
  ip_address  VARCHAR(45)     NULL,
  user_agent  VARCHAR(500)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_id, created_at DESC),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at DESC)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- Crowd target aggregation per ticker
CREATE OR REPLACE VIEW v_crowd_targets AS
SELECT
  t.ticker,
  COUNT(*) AS tip_count,
  AVG(t.target) AS avg_target,
  SUM(CASE WHEN t.sentiment='bull'    THEN 1 ELSE 0 END) AS bull_count,
  SUM(CASE WHEN t.sentiment='bear'    THEN 1 ELSE 0 END) AS bear_count,
  SUM(CASE WHEN t.sentiment='neutral' THEN 1 ELSE 0 END) AS neutral_count,
  LEAST(95, 40 + COUNT(*) * 8 + IF(COUNT(*) > 3, 10, 0)) AS confidence
FROM tips t
WHERE t.status = 'open'
GROUP BY t.ticker;

-- Analyst stats (overall + free tip accuracy)
CREATE OR REPLACE VIEW v_analyst_stats AS
SELECT
  u.id AS user_id,
  u.name,
  u.handle,
  u.sebi,
  u.sebi_verified,
  COUNT(t.id) AS total_tips,
  SUM(CASE WHEN t.is_paid=0 THEN 1 ELSE 0 END) AS free_tips,
  SUM(CASE WHEN t.is_paid=1 THEN 1 ELSE 0 END) AS paid_tips,
  SUM(CASE WHEN t.result='win'  THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN t.result='loss' THEN 1 ELSE 0 END) AS losses,
  ROUND(
    SUM(CASE WHEN t.result='win'  THEN 1 ELSE 0 END) /
    NULLIF(SUM(CASE WHEN t.result IN ('win','loss') THEN 1 ELSE 0 END), 0) * 100, 1
  ) AS overall_accuracy,
  ROUND(
    SUM(CASE WHEN t.is_paid=0 AND t.result='win' THEN 1 ELSE 0 END) /
    NULLIF(SUM(CASE WHEN t.is_paid=0 AND t.result IN ('win','loss') THEN 1 ELSE 0 END), 0) * 100, 1
  ) AS free_accuracy
FROM users u
LEFT JOIN tips t ON t.user_id = u.id
WHERE u.role = 'user' AND u.status = 'active'
GROUP BY u.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO users (name, handle, email, password_hash, role, status, sebi, reg_no, sebi_verified, accuracy, streak, points, bio) VALUES
('Admin',         '@admin',     'admin@stockpulse.in',  '$2b$10$hashplaceholder',  'admin', 'active', FALSE, NULL,           FALSE, NULL,  0,  0,    'Platform administrator'),
('Arjun Mehta',   '@arjunm',    'arjun@stockpulse.in',  '$2b$10$hashplaceholder',  'user',  'active', TRUE,  'INH000056789', TRUE,  84.00, 12, 9420, 'SEBI-registered Research Analyst. Large-cap momentum specialist.'),
('Priya Sharma',  '@priyas',    'priya@stockpulse.in',  '$2b$10$hashplaceholder',  'user',  'active', TRUE,  'INH000078234', TRUE,  79.00, 8,  7810, 'SEBI-registered RA. Options and Bank Nifty specialist.'),
('Rohan Das',     '@rohd',      'rohan@stockpulse.in',  '$2b$10$hashplaceholder',  'user',  'active', TRUE,  'INH000091045', TRUE,  76.00, 5,  6550, 'SEBI-registered RA. Long-term fundamental investor.'),
('Sneha Iyer',    '@snehai',    'sneha@stockpulse.in',  '$2b$10$hashplaceholder',  'user',  'active', TRUE,  'INH000034512', FALSE, 71.00, 3,  5200, 'Macro analyst. Pending SEBI verification.'),
('Vikram Nair',   '@vikn',      'vikram@stockpulse.in', '$2b$10$hashplaceholder',  'user',  'active', FALSE, NULL,           FALSE, 68.00, 2,  4100, 'Technical analyst. Independent.'),
('Rahul Singh',   '@rahuls',    'rahul@stockpulse.in',  '$2b$10$hashplaceholder',  'user',  'active', FALSE, NULL,           FALSE, NULL,  0,  820,  'Retail trader. Following top SEBI analysts.');

INSERT INTO plans (user_id, name, price, billing_cycle, max_subs, focus, perks, subscriber_count, total_revenue, active) VALUES
(2, 'Alpha Pro',  1499.00, 'monthly', 300, '["Daily Calls","Swing Trades","Positional Ideas"]', '["2-3 premium calls daily","Entry/SL/target","Weekend outlook","Priority Telegram","Monthly review"]', 214, 320786.00, TRUE),
(3, 'Swing Edge',  999.00, 'monthly', 250, '["Swing Trades","Options Strategies"]',             '["3-5 swing setups weekly","Entry/exit levels","SL management","Real-time alerts"]',              178, 177822.00, TRUE),
(4, 'LongView',    699.00, 'monthly', 200, '["Long-Term Investments","Fundamental Picks"]',     '["Weekly long-term picks","Earnings preview notes","Quarterly rebalance","Deep-dives"]',          95,  66405.00,  TRUE);

INSERT INTO stocks (ticker, name, sector, industry, exchange, is_index, current_price, day_change_pct) VALUES
('RELIANCE',   'Reliance Industries', 'Energy',  'Diversified',    'NSE', FALSE, 2847.00,  1.20),
('TCS',        'Tata Consultancy',    'IT',      'IT Services',    'NSE', FALSE, 3921.00, -0.40),
('HDFC',       'HDFC Bank',           'Finance', 'Private Bank',   'NSE', FALSE, 1634.00,  0.80),
('INFY',       'Infosys',             'IT',      'IT Services',    'NSE', FALSE, 1512.00, -0.20),
('ITC',        'ITC Ltd',             'FMCG',    'Tobacco/FMCG',   'NSE', FALSE, 463.00,   0.50),
('WIPRO',      'Wipro',               'IT',      'IT Services',    'NSE', FALSE, 529.00,   1.10),
('MARUTI',     'Maruti Suzuki',       'Auto',    'Passenger Cars', 'NSE', FALSE, 10850.00, 0.70),
('BAJFINANCE', 'Bajaj Finance',       'Finance', 'NBFC',           'NSE', FALSE, 6780.00, -0.90),
('NIFTY50',    'Nifty 50 Index',      'Index',   'Index',          'NSE', TRUE,  22480.00, 0.30),
('BANKNIFTY',  'Bank Nifty Index',    'Index',   'Index',          'NSE', TRUE,  47320.00, 0.60);

INSERT INTO fundamentals (ticker, market_cap, pe_ratio, pb_ratio, eps, book_value, debt_to_equity, roe, roce, dividend_yield, face_value, week_52_high, week_52_low, revenue, net_profit, ebitda, ebitda_margin, net_profit_margin, analyst_target, rating, description) VALUES
('RELIANCE', '19.2L Cr', 24.80, 3.60, 114.70, 1378.00, 0.38, 10.20, 11.80, 0.32, 10.00, 3024.00, 2220.00, '9,74,864 Cr', '79,020 Cr', '1,78,677 Cr', '18.3%', '8.1%',  3200.00, 'BUY',  'Reliance Industries is India''s largest private-sector company with diversified interests across oil & gas, petrochemicals, retail, and digital services through Jio.'),
('TCS',      '14.3L Cr', 28.10, 12.40, 139.60, 316.00, 0.02, 48.30, 62.10, 1.42, 1.00,  4255.00, 3311.00, '2,40,893 Cr', '45,908 Cr', '60,228 Cr',   '25.0%', '19.1%', 4400.00, 'BUY',  'TCS is India''s largest IT services company offering consulting, technology and business solutions.'),
('HDFC',     '12.4L Cr', 18.60, 2.80,  87.80,  583.00, 7.80, 16.20, 7.80,  1.10, 1.00,  1794.00, 1363.00, '2,87,416 Cr', '64,062 Cr', NULL,          'N/A',   '22.3%', 1900.00, 'BUY',  'HDFC Bank is India''s largest private-sector bank by assets.'),
('ITC',      '5.8L Cr',  26.10, 7.20,  17.70,  64.00,  0.00, 28.60, 37.90, 2.80, 1.00,  508.00,  394.00,  '72,311 Cr',   '20,458 Cr', '28,774 Cr',   '39.8%', '28.3%', 580.00,  'BUY',  'ITC is a diversified conglomerate with leading FMCG, hospitality, paperboards and agribusiness divisions.');

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'Schema created successfully' AS status;
