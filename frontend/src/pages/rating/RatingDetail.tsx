import { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button, Space, Row, Col, Progress, Table, Avatar, List } from 'antd';
import { ArrowLeftOutlined, TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined, CustomerServiceOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ratingApi } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';
import { SupplierRatingDetail, RatingDimensionScore, RectificationNotice } from '../../types';

const RatingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState<SupplierRatingDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadRating();
    }
  }, [id]);

  const loadRating = async () => {
    setLoading(true);
    try {
      const data = await ratingApi.getRating(id!);
      setRating(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (levelVal: string) => {
    const colorMap: Record<string, string> = {
      A: '#f5222d',
      B: '#fa8c16',
      C: '#faad14'
    };
    return colorMap[levelVal] || '#8c8c8c';
  };

  const getDimensionIcon = (dimension: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      delivery: <ClockCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      quality: <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      service: <CustomerServiceOutlined style={{ fontSize: 24, color: '#faad14' }} />,
      price: <DollarOutlined style={{ fontSize: 24, color: '#722ed1' }} />
    };
    return iconMap[dimension] || null;
  };

  const getDimensionColor = (dimension: string) => {
    const colorMap: Record<string, string> = {
      delivery: '#1890ff',
      quality: '#52c41a',
      service: '#faad14',
      price: '#722ed1'
    };
    return colorMap[dimension] || '#8c8c8c';
  };

  const formatRawValue = (dim: RatingDimensionScore) => {
    if (dim.dimension === 'delivery') {
      return `${dim.rawValue}%`;
    }
    if (dim.dimension === 'quality') {
      return `${dim.rawValue}%`;
    }
    if (dim.dimension === 'service') {
      return `${dim.rawValue} 小时`;
    }
    if (dim.dimension === 'price') {
      return dim.rawValue.toString();
    }
    return dim.rawValue.toString();
  };

  const rectificationColumns = [
    {
      title: '通知单号',
      dataIndex: 'noticeNo',
      key: 'noticeNo',
      render: (text: string, record: RectificationNotice) => (
        <a onClick={() => navigate(`/rating/rectifications/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '周期',
      dataIndex: 'period',
      key: 'period'
    },
    {
      title: '评级等级',
      dataIndex: 'ratingLevel',
      key: 'ratingLevel',
      render: (levelVal: string) => (
        <Tag color={getLevelColor(levelVal)}>{levelVal}级</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          pending: { text: '待处理', color: 'orange' },
          in_progress: { text: '处理中', color: 'blue' },
          submitted: { text: '已提交', color: 'cyan' },
          verified: { text: '已验证', color: 'green' },
          closed: { text: '已关闭', color: 'default' }
        };
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (val: string) => formatDate(val)
    }
  ];

  const historyRatings = rating?.historyRatings || [];

  const historyColumns = [
    {
      title: '周期',
      dataIndex: 'period',
      key: 'period'
    },
    {
      title: '综合得分',
      dataIndex: 'overallScore',
      key: 'overallScore',
      render: (val: number) => <strong>{val}</strong>
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (levelVal: string) => (
        <Tag color={getLevelColor(levelVal)}>{levelVal}级</Tag>
      )
    }
  ];

  if (!rating && !loading) {
    return <div style={{ padding: 50, textAlign: 'center' }}>加载中...</div>;
  }

  const dimensions = rating?.dimensions || [];

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
          <Avatar size="large" icon={<TrophyOutlined />} style={{ backgroundColor: getLevelColor(rating?.level || 'C') }} />
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>{rating?.supplier?.name || '-'}</h2>
            <div style={{ color: '#999', fontSize: 12 }}>
              {rating?.period} 评级报告
            </div>
          </div>
          {rating?.level && (
            <Tag color={getLevelColor(rating.level)} icon={<TrophyOutlined />} style={{ marginLeft: 16, fontSize: 14, padding: '4px 12px' }}>
              {rating.level}级供应商
            </Tag>
          )}
        </Space>
      </div>

      <div className="page-content">
        <Card className="card-shadow" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={6} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: getLevelColor(rating?.level || 'C') }}>
                {rating?.overallScore}
              </div>
              <div style={{ color: '#999', marginTop: 8 }}>综合得分</div>
            </Col>
            {dimensions.map((dim) => (
              <Col key={dim.dimension} span={4}>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  {getDimensionIcon(dim.dimension)}
                </div>
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#666' }}>{dim.name}</span>
                </div>
                <Progress percent={dim.score} showInfo={false} strokeColor={getDimensionColor(dim.dimension)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                  <span style={{ color: getDimensionColor(dim.dimension), fontWeight: 500 }}>{dim.score}分</span>
                  <span style={{ color: '#999' }}>权重 {dim.weight}%</span>
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={16}>
          <Col span={16}>
            <Card title="维度得分详情" className="card-shadow" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                {dimensions.map((dim) => (
                  <Col key={dim.dimension} span={12}>
                    <Card
                      size="small"
                      style={{ marginBottom: 16 }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ marginRight: 12 }}>
                          {getDimensionIcon(dim.dimension)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{dim.name}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>权重 {dim.weight}%</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#666' }}>原始值</span>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{formatRawValue(dim)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: '#666' }}>得分</span>
                          <span style={{ fontSize: 12, color: getDimensionColor(dim.dimension), fontWeight: 500 }}>
                            {dim.score} 分
                          </span>
                        </div>
                      </div>
                      <Progress
                        percent={dim.score}
                        showInfo={false}
                        strokeColor={getDimensionColor(dim.dimension)}
                        size="small"
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            <Card title="历史评级趋势" className="card-shadow" style={{ marginBottom: 16 }}>
              {historyRatings.length > 0 ? (
                <>
                  <div style={{ marginBottom: 16, padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 }}>
                      {[...historyRatings].reverse().map((item, index) => (
                        <div key={item.id} style={{ textAlign: 'center', flex: 1 }}>
                          <div
                            style={{
                              width: '60%',
                              margin: '0 auto',
                              backgroundColor: getLevelColor(item.level),
                              borderRadius: '4px 4px 0 0',
                              height: `${item.overallScore}px`,
                              minHeight: 20
                            }}
                          />
                          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>{item.period}</div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{item.overallScore}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Table
                    columns={historyColumns}
                    dataSource={historyRatings}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
                  暂无历史评级数据
                </div>
              )}
            </Card>

            <Card title="整改通知" className="card-shadow">
              {rating?.rectifications && rating.rectifications.length > 0 ? (
                <Table
                  columns={rectificationColumns}
                  dataSource={rating.rectifications}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
                  暂无整改通知
                </div>
              )}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="基本信息" className="card-shadow" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="供应商">{rating?.supplier?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="评级周期">{rating?.period || '-'}</Descriptions.Item>
                <Descriptions.Item label="综合得分">
                  <span style={{ fontWeight: 'bold', color: getLevelColor(rating?.level || 'C') }}>
                    {rating?.overallScore} 分
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="评级等级">
                  <Tag color={getLevelColor(rating?.level || 'C')}>{rating?.level}级</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="订单数">{rating?.orderCount || 0} 单</Descriptions.Item>
                <Descriptions.Item label="准时交付率">{rating?.onTimeDeliveryRate || 0}%</Descriptions.Item>
                <Descriptions.Item label="产品合格率">{rating?.passRate || 0}%</Descriptions.Item>
                <Descriptions.Item label="平均响应时间">{rating?.avgResponseTime || 0} 小时</Descriptions.Item>
                <Descriptions.Item label="投诉数">{rating?.complaintCount || 0} 次</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(rating?.createdAt || '')}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="快捷操作" className="card-shadow">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block onClick={() => navigate(`/suppliers/${rating?.supplierId}`)}>
                  查看供应商详情
                </Button>
                <Button block onClick={() => navigate('/rating/rectifications')}>
                  查看整改通知
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default RatingDetail;
