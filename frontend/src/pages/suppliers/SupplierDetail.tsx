import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, message, Row, Col, Table, Progress, Avatar, Rate } from 'antd';
import { ArrowLeftOutlined, ShopOutlined, TrophyOutlined, StarOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { supplierApi } from '../../services/api';
import { formatMoney, formatDate, formatDateTime } from '../../utils/format';
import { Company, SupplierRating, PriceQuote } from '../../types';

const SupplierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Company | null>(null);
  const [ratings, setRatings] = useState<SupplierRating[]>([]);
  const [quotes, setQuotes] = useState<PriceQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [quotesTotal, setQuotesTotal] = useState(0);
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesPageSize, setQuotesPageSize] = useState(5);

  useEffect(() => {
    if (id) {
      loadSupplier();
      loadRatings();
      loadQuotes();
    }
  }, [id, quotesPage, quotesPageSize]);

  const loadSupplier = async () => {
    setLoading(true);
    try {
      const data = await supplierApi.getSupplier(id!);
      setSupplier(data);
    } catch (e) {
      console.error(e);
      message.error('加载供应商详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      const data = await supplierApi.getRatings(id!);
      setRatings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadQuotes = async () => {
    try {
      const data = await supplierApi.getQuotes({ supplierId: id, page: quotesPage, pageSize: quotesPageSize });
      setQuotes(data.records);
      setQuotesTotal(data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const getLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      A: '#f5222d',
      B: '#fa8c16',
      C: '#faad14',
      D: '#8c8c8c'
    };
    return colorMap[level] || '#8c8c8c';
  };

  const ratingColumns = [
    {
      title: '评级周期',
      dataIndex: 'period',
      key: 'period'
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={getLevelColor(level)} icon={<TrophyOutlined />}>
          {level}级
        </Tag>
      )
    },
    {
      title: '综合评分',
      dataIndex: 'overallScore',
      key: 'overallScore',
      render: (val: number) => <strong>{val}</strong>
    },
    {
      title: '交期得分',
      dataIndex: 'deliveryScore',
      key: 'deliveryScore'
    },
    {
      title: '品质得分',
      dataIndex: 'qualityScore',
      key: 'qualityScore'
    },
    {
      title: '服务得分',
      dataIndex: 'serviceScore',
      key: 'serviceScore'
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount'
    },
    {
      title: '准时交付率',
      dataIndex: 'onTimeDeliveryRate',
      key: 'onTimeDeliveryRate',
      render: (val: number) => `${val}%`
    },
    {
      title: '合格率',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (val: number) => `${val}%`
    }
  ];

  const quoteColumns = [
    {
      title: '零件名称',
      dataIndex: 'partName',
      key: 'partName'
    },
    {
      title: '零件编号',
      dataIndex: 'partCode',
      key: 'partCode'
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '起订量',
      dataIndex: 'minOrderQuantity',
      key: 'minOrderQuantity'
    },
    {
      title: '交付周期',
      dataIndex: 'deliveryDays',
      key: 'deliveryDays',
      render: (val: number) => `${val} 天`
    },
    {
      title: '质量等级',
      dataIndex: 'qualityGrade',
      key: 'qualityGrade'
    },
    {
      title: '不良率',
      dataIndex: 'defectRate',
      key: 'defectRate',
      render: (val: number) => `${val}%`
    },
    {
      title: '有效期',
      key: 'valid',
      render: (_: any, record: PriceQuote) => (
        <span>{formatDate(record.validFrom)} ~ {formatDate(record.validTo)}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? '有效' : '失效'}
        </Tag>
      )
    }
  ];

  if (!supplier && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const latestRating = supplier?.latestRating;

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <Avatar size="large" icon={<ShopOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>{supplier?.name}</h2>
            <div style={{ color: '#999', fontSize: 12 }}>
              {supplier?.type === 'supplier' ? '原料供应商' : '加工厂'}
              {supplier?.creditLevel && ` · ${supplier.creditLevel}信用`}
            </div>
          </div>
          {latestRating && (
            <Tag color={getLevelColor(latestRating.level)} icon={<TrophyOutlined />} style={{ marginLeft: 16 }}>
              {latestRating.level}级供应商
            </Tag>
          )}
        </Space>
      </div>

      <div className="page-content">
        {latestRating && (
          <Card className="card-shadow" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={4} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: getLevelColor(latestRating.level) }}>
                  {latestRating.overallScore}
                </div>
                <div style={{ color: '#999' }}>综合评分</div>
              </Col>
              <Col span={5}>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    <span>交期得分</span>
                  </Space>
                </div>
                <Progress percent={latestRating.deliveryScore} showInfo={false} strokeColor="#1890ff" />
                <div style={{ textAlign: 'right', color: '#1890ff', marginTop: 4 }}>
                  {latestRating.deliveryScore}分
                </div>
              </Col>
              <Col span={5}>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>品质得分</span>
                  </Space>
                </div>
                <Progress percent={latestRating.qualityScore} showInfo={false} strokeColor="#52c41a" />
                <div style={{ textAlign: 'right', color: '#52c41a', marginTop: 4 }}>
                  {latestRating.qualityScore}分
                </div>
              </Col>
              <Col span={5}>
                <div style={{ marginBottom: 8 }}>
                  <Space>
                    <StarOutlined style={{ color: '#faad14' }} />
                    <span>服务得分</span>
                  </Space>
                </div>
                <Progress percent={latestRating.serviceScore} showInfo={false} strokeColor="#faad14" />
                <div style={{ textAlign: 'right', color: '#faad14', marginTop: 4 }}>
                  {latestRating.serviceScore}分
                </div>
              </Col>
              <Col span={5} style={{ textAlign: 'center' }}>
                <div>准时交付率</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {latestRating.onTimeDeliveryRate}%
                </div>
                <div style={{ color: '#999', fontSize: 12 }}>
                  合格率 {latestRating.passRate}%
                </div>
              </Col>
            </Row>
          </Card>
        )}

        <Row gutter={16}>
          <Col span={16}>
            <Card title="基本信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="公司名称">{supplier?.name}</Descriptions.Item>
                <Descriptions.Item label="公司类型">
                  {supplier?.type === 'supplier' ? '原料供应商' : '加工厂'}
                </Descriptions.Item>
                <Descriptions.Item label="联系人">{supplier?.contactPerson}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{supplier?.contactPhone}</Descriptions.Item>
                <Descriptions.Item label="公司地址" span={2}>{supplier?.address}</Descriptions.Item>
                <Descriptions.Item label="信用等级">{supplier?.creditLevel || '-'}</Descriptions.Item>
                <Descriptions.Item label="合作订单数">{supplier?.orderCount || 0} 单</Descriptions.Item>
                <Descriptions.Item label="入驻时间">{formatDate(supplier?.createdAt || '')}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card 
              title="历史评级" 
              className="card-shadow"
              style={{ marginBottom: 16 }}
            >
              <Table
                columns={ratingColumns}
                dataSource={ratings}
                rowKey="id"
                pagination={false}
                size="small"
              />
              {ratings.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  暂无评级记录
                </div>
              )}
            </Card>

            <Card title="报价信息" className="card-shadow">
              <Table
                columns={quoteColumns}
                dataSource={quotes}
                rowKey="id"
                pagination={{
                  current: quotesPage,
                  pageSize: quotesPageSize,
                  total: quotesTotal,
                  onChange: (page, pageSize) => {
                    setQuotesPage(page);
                    setQuotesPageSize(pageSize);
                  }
                }}
                size="small"
              />
            </Card>
          </Col>

          <Col span={8}>
            <Card title="联系方式" className="card-shadow" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ color: '#999', marginBottom: 4 }}>联系人</div>
                  <div style={{ fontSize: 16 }}>{supplier?.contactPerson}</div>
                </div>
                <div>
                  <div style={{ color: '#999', marginBottom: 4 }}>联系电话</div>
                  <div style={{ fontSize: 16, color: '#1890ff' }}>{supplier?.contactPhone}</div>
                </div>
                <div>
                  <div style={{ color: '#999', marginBottom: 4 }}>公司地址</div>
                  <div>{supplier?.address}</div>
                </div>
              </Space>
            </Card>

            <Card title="快捷操作" className="card-shadow">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block>
                  发起询价
                </Button>
                <Button block>
                  查看合作订单
                </Button>
                <Button block>
                  提交评价
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default SupplierDetail;
