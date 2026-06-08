import { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Tag, Space, Table, message, Collapse, Row, Col, Badge, Tooltip, Divider } from 'antd';
import { SearchOutlined, ReloadOutlined, TrophyOutlined, ThunderboltOutlined, SafetyOutlined, RiseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../../services/api';
import { formatMoney } from '../../utils/format';
import { PriceQuote } from '../../types';

const { Option } = Select;
const { Panel } = Collapse;

const PriceCompare = () => {
  const [compareData, setCompareData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [partCode, setPartCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCompareData();
  }, [keyword, partCode]);

  const loadCompareData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (keyword) params.keyword = keyword;
      if (partCode) params.partCode = partCode;
      
      const data = await supplierApi.getQuoteCompare(params);
      setCompareData(data);
    } catch (e) {
      console.error(e);
      message.error('加载比价数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#1890ff';
    if (score >= 70) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreBadge = (index: number) => {
    const colors = ['#f5222d', '#fa8c16', '#faad14', '#52c41a'];
    const labels = ['性价比最优', '价格最优', '交期最优', '品质最优'];
    if (index < 4) {
      return (
        <Badge 
          count={labels[index]} 
          style={{ backgroundColor: colors[index], marginRight: 8 }} 
        />
      );
    }
    return null;
  };

  const renderCompareCard = (group: any, index: number) => {
    const quotes = group.quotes || [];
    
    return (
      <Card 
        key={group.partCode} 
        className="card-shadow" 
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>{group.partName}</span>
            <Tag color="blue">{group.partCode}</Tag>
            <span style={{ color: '#999', fontSize: 12 }}>
              {quotes.length} 家供应商报价
            </span>
          </Space>
        }
        extra={
          <Button type="primary" size="small">
            快速下单
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          {quotes.map((quote: PriceQuote, qIndex: number) => (
            <Col span={8} key={quote.id}>
              <Card 
                size="small"
                style={{ 
                  border: qIndex === 0 ? '2px solid #f5222d' : '1px solid #e8e8e8',
                  position: 'relative'
                }}
                hoverable
              >
                {getScoreBadge(qIndex)}
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
                    {formatMoney(quote.unitPrice)}
                  </div>
                  <div style={{ color: '#999', fontSize: 12 }}>单价</div>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#999' }}>供应商：</span>
                    <span>
                      <a onClick={() => navigate(`/suppliers/${quote.supplierId}`)}>
                        {quote.supplierName}
                      </a>
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#999' }}>
                      <ThunderboltOutlined style={{ marginRight: 4 }} />
                      交期：
                    </span>
                    <span>{quote.deliveryDays} 天</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#999' }}>
                      <SafetyOutlined style={{ marginRight: 4 }} />
                      质量：
                    </span>
                    <span>{quote.qualityGrade}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#999' }}>起订量：</span>
                    <span>{quote.minOrderQuantity} 件</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#999' }}>不良率：</span>
                    <span style={{ color: quote.defectRate > 2 ? '#f5222d' : '#52c41a' }}>
                      {quote.defectRate}%
                    </span>
                  </div>
                </div>
                <Button type="primary" block size="small" style={{ marginTop: 12 }}>
                  选择此报价
                </Button>
              </Card>
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Space size="large">
            <div>
              <span style={{ color: '#999' }}>最低价：</span>
              <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
                {formatMoney(quotes[0]?.unitPrice || 0)}
              </span>
            </div>
            <div>
              <span style={{ color: '#999' }}>最高价：</span>
              <span style={{ color: '#faad14', fontWeight: 'bold' }}>
                {formatMoney(quotes[quotes.length - 1]?.unitPrice || 0)}
              </span>
            </div>
            <div>
              <span style={{ color: '#999' }}>平均价：</span>
              <span style={{ fontWeight: 'bold' }}>
                {formatMoney(
                  quotes.reduce((sum: number, q: PriceQuote) => sum + q.unitPrice, 0) / (quotes.length || 1)
                )}
              </span>
            </div>
            <div>
              <span style={{ color: '#999' }}>报价差幅：</span>
              <span style={{ color: '#fa8c16' }}>
                {quotes.length > 1 
                  ? Math.round(((quotes[quotes.length - 1]?.unitPrice - quotes[0]?.unitPrice) / quotes[0]?.unitPrice) * 100) 
                  : 0}%
              </span>
            </div>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">智能比价</h2>
          <Space>
            <Button onClick={() => navigate('/suppliers')}>
              供应商列表
            </Button>
          </Space>
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow" style={{ marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="搜索零件名称/编号"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Input
              placeholder="零件编号精确匹配"
              style={{ width: 200 }}
              value={partCode}
              onChange={e => setPartCode(e.target.value)}
              allowClear
            />
            <Button type="primary" icon={<RiseOutlined />} onClick={loadCompareData}>
              开始比价
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadCompareData}>刷新</Button>
          </Space>
        </Card>

        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Tag icon={<TrophyOutlined />} color="red">性价比最优</Tag>
            <Tag color="orange">价格最优</Tag>
            <Tag color="gold">交期最优</Tag>
            <Tag color="green">品质最优</Tag>
          </Space>
        </div>

        {loading ? (
          <Card className="card-shadow" style={{ textAlign: 'center', padding: 50 }}>
            加载中...
          </Card>
        ) : compareData.length > 0 ? (
          compareData.map((group, index) => renderCompareCard(group, index))
        ) : (
          <Card className="card-shadow" style={{ textAlign: 'center', padding: 50, color: '#999' }}>
            暂无比价数据，请调整搜索条件
          </Card>
        )}
      </div>
    </div>
  );
};

export default PriceCompare;
