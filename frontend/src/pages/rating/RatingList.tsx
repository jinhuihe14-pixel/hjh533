import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined, TrophyOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ratingApi } from '../../services/api';
import { formatDate } from '../../utils/format';
import { SupplierRatingDetail } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const RatingList = () => {
  const [ratings, setRatings] = useState<SupplierRatingDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [period, setPeriod] = useState('');
  const [level, setLevel] = useState('');
  const [keyword, setKeyword] = useState('');
  const [calculating, setCalculating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadRatings();
  }, [page, pageSize, period, level, keyword]);

  const loadRatings = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (period) params.period = period;
      if (level) params.level = level;
      if (keyword) params.keyword = keyword;

      const data = await ratingApi.getRatings(params);
      setRatings(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载评级列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      await ratingApi.calculateRatings(period || undefined);
      message.success('评级计算成功');
      loadRatings();
    } catch (e) {
      console.error(e);
      message.error('评级计算失败');
    } finally {
      setCalculating(false);
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

  const columns = [
    {
      title: '供应商名称',
      dataIndex: 'supplier',
      key: 'supplierName',
      render: (_: any, record: SupplierRatingDetail) => (
        <a onClick={() => navigate(`/rating/ratings/${record.id}`)}>
          {record.supplier?.name || '-'}
        </a>
      )
    },
    {
      title: '评级周期',
      dataIndex: 'period',
      key: 'period'
    },
    {
      title: '综合得分',
      dataIndex: 'overallScore',
      key: 'overallScore',
      render: (val: number) => (
        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{val}</span>
      )
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (levelVal: string) => (
        <Tag color={getLevelColor(levelVal)} icon={<TrophyOutlined />}>
          {levelVal}级
        </Tag>
      )
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (val?: number) => `${val || 0} 单`
    },
    {
      title: '准时率',
      dataIndex: 'onTimeDeliveryRate',
      key: 'onTimeDeliveryRate',
      render: (val?: number) => `${val || 0}%`
    },
    {
      title: '合格率',
      dataIndex: 'passRate',
      key: 'passRate',
      render: (val?: number) => `${val || 0}%`
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => formatDate(val)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: SupplierRatingDetail) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/rating/ratings/${record.id}`)}>
            详情
          </Button>
        </Space>
      )
    }
  ];

  const canCalculate = user?.role === 'admin' || user?.role === 'demander';

  const periodOptions = [
    { value: '', label: '全部周期' },
    { value: '2026-05', label: '2026年05月' },
    { value: '2026-04', label: '2026年04月' },
    { value: '2026-03', label: '2026年03月' },
    { value: '2026-02', label: '2026年02月' },
    { value: '2026-01', label: '2026年01月' }
  ];

  const levelOptions = [
    { value: '', label: '全部等级' },
    { value: 'A', label: 'A级' },
    { value: 'B', label: 'B级' },
    { value: 'C', label: 'C级' }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">供应商评级</h2>
          {canCalculate && (
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              loading={calculating}
              onClick={handleCalculate}
            >
              计算评级
            </Button>
          )}
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索供应商名称"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="评级周期"
              style={{ width: 150 }}
              value={period || undefined}
              onChange={val => setPeriod(val || '')}
              allowClear
            >
              {periodOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Select
              placeholder="评级等级"
              style={{ width: 120 }}
              value={level || undefined}
              onChange={val => setLevel(val || '')}
              allowClear
            >
              {levelOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadRatings}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={ratings}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (totalCount) => `共 ${totalCount} 条`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default RatingList;
